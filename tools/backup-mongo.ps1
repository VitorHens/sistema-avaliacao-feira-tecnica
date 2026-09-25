param([string]$OutputDirectory = "backups")
$ErrorActionPreference = 'Stop'
$dump = Get-Command mongodump -ErrorAction SilentlyContinue
if (-not $dump) { throw 'Instale MongoDB Database Tools para usar mongodump.' }
$database = if ($env:MONGODB_DATABASE) { $env:MONGODB_DATABASE } else { 'feira-tecnica2026' }
$uri = if ($env:MONGODB_URI) { $env:MONGODB_URI } else { 'mongodb://localhost:27017' }
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$directory = [System.IO.Path]::GetFullPath((Join-Path $root $OutputDirectory))
if (-not $directory.StartsWith($root + [System.IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'O diretório de backup deve ficar dentro do projeto.'
}
New-Item -ItemType Directory -Path $directory -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$archive = Join-Path $directory "$database-$stamp.archive.gz"
& $dump.Source "--uri=$uri" "--db=$database" "--archive=$archive" '--gzip'
if ($LASTEXITCODE -ne 0) { throw 'O backup do MongoDB falhou.' }
Write-Output "Backup criado: $archive"
