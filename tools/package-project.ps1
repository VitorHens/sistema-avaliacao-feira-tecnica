param(
    [string]$OutputPath = ''
)

$ErrorActionPreference = 'Stop'
$project = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$projectName = Split-Path $project -Leaf
if (-not $OutputPath) {
    $OutputPath = Join-Path (Split-Path $project -Parent) 'feira-tecnica-organizada.zip'
}
$OutputPath = [System.IO.Path]::GetFullPath($OutputPath)

$included = @(
    '.env.example', '.gitignore', 'package.json', 'package-lock.json',
    'index.js', 'Server.js', 'README.md', 'SECURITY.md', 'docs',
    'src', 'tests', 'tools', 'nginx/conf/nginx.conf', 'nginx/conf/mime.types'
)
$excluded = '(^|/)(node_modules|data|backups|system|feira-tecnica-atualizada)(/|$)|projetos-feira-2026\.json$|\.log$'

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$stream = [System.IO.File]::Open($OutputPath, [System.IO.FileMode]::Create)
try {
    $archive = [System.IO.Compression.ZipArchive]::new(
        $stream, [System.IO.Compression.ZipArchiveMode]::Create, $false
    )
    try {
        foreach ($entry in $included) {
            $fullPath = Join-Path $project $entry
            if (-not (Test-Path -LiteralPath $fullPath)) { continue }
            $item = Get-Item -LiteralPath $fullPath
            $files = if ($item.PSIsContainer) {
                Get-ChildItem -LiteralPath $fullPath -Recurse -File
            } else { @($item) }

            foreach ($file in $files) {
                if (-not $file.FullName.StartsWith($project + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
                    throw "Arquivo fora do projeto: $($file.FullName)"
                }
                $relative = $file.FullName.Substring($project.Length + 1).Replace('\', '/')
                if ($relative -match $excluded) { continue }
                $archivePath = "$projectName/$relative"
                [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                    $archive, $file.FullName, $archivePath,
                    [System.IO.Compression.CompressionLevel]::Optimal
                ) | Out-Null
            }
        }
    } finally { $archive.Dispose() }
} finally { $stream.Dispose() }

$archive = [System.IO.Compression.ZipFile]::OpenRead($OutputPath)
try {
    $names = @($archive.Entries | ForEach-Object FullName)
    if ($names | Where-Object { $_ -match $excluded }) {
        throw 'O pacote contém um arquivo que deveria ter sido excluído.'
    }
    if (-not ($names | Where-Object { $_ -match '/src/public/modelo-professores\.csv$' })) {
        throw 'O modelo da planilha de professores não entrou no pacote.'
    }
    Write-Output "Pacote: $OutputPath"
    Write-Output "Arquivos: $($names.Count)"
} finally { $archive.Dispose() }
