const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const publicDir = path.resolve(__dirname, '../src/public');
const errors = [];
let scriptsChecked = 0;

function checkLocalReference(file, reference) {
    if (/^(?:https?:|data:|mailto:|tel:|\/|\$)/i.test(reference) || reference.includes('${')) return;
    const resource = reference.split(/[?#]/)[0];
    if (!resource) return;
    const target = path.resolve(path.dirname(file), resource);
    if (!target.startsWith(publicDir + path.sep) || !fs.existsSync(target)) {
        errors.push(`${path.relative(publicDir, file)}: recurso ausente: ${reference}`);
    }
}

function checkInlineScript(file, script, attributes) {
    if (!script.trim()) return;
    try {
        if (/\btype=["']module["']/i.test(attributes)) {
            const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {
                input: script,
                encoding: 'utf8',
            });
            if (result.status !== 0) throw new Error(result.stderr.trim());
        } else {
            new vm.Script(script, { filename: file });
        }
        scriptsChecked++;
    } catch (error) {
        errors.push(`${path.relative(publicDir, file)}: ${error.message}`);
    }
}

function checkHtml(file) {
    const html = fs.readFileSync(file, 'utf8');
    for (const [, attributes, script] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        if (!/\bsrc\s*=/i.test(attributes)) checkInlineScript(file, script, attributes);
    }
    for (const [, reference] of html.matchAll(/(?:href|src)=["']([^"'#]+)["']/gi)) {
        checkLocalReference(file, reference);
    }
}

function checkAsset(file) {
    const source = fs.readFileSync(file, 'utf8');
    if (file.endsWith('.js')) {
        try {
            new vm.Script(source, { filename: file });
            scriptsChecked++;
        } catch (error) {
            errors.push(`${path.relative(publicDir, file)}: ${error.message}`);
        }
    } else {
        for (const [, reference] of source.matchAll(/@import\s+(?:url\()?\s*["']([^"']+)["']/gi)) {
            checkLocalReference(file, reference);
        }
    }
}

for (const name of fs.readdirSync(publicDir).filter(name => name.endsWith('.html'))) {
    checkHtml(path.join(publicDir, name));
}
for (const folder of ['js', 'css']) {
    for (const name of fs.readdirSync(path.join(publicDir, folder))) {
        if (name.endsWith(folder === 'js' ? '.js' : '.css')) {
            checkAsset(path.join(publicDir, folder, name));
        }
    }
}

if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
} else {
    console.log(`${scriptsChecked} scripts validados; referências HTML e imports CSS conferidos.`);
}
