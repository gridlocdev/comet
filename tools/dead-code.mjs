#!/usr/bin/env node
// Dead-code report for no-bundler ES-module games.
//
//   node dead-code.mjs [projectDir] [--json]
//
// Follows imports from the game's entry points (every <script type="module" src> in the project's .html files) and
// separately from test/ and tools/, then lists:
//   - modules nothing reaches, and modules only tests or tools reach
//   - exports no file imports, and exports only tests import
//   - asset files (images, sound, fonts, models, data) whose file name no code, page, style or manifest mentions
// It reads import statements and file names as text. It can't see a module loaded from a path built at run time
// (import(`./levels/${id}.js`)) or an asset named that way (`${key}.svg`), so check each finding before deleting it.
// It only reports; it never deletes.

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const root = path.resolve(args.find(a => !a.startsWith('--')) ?? '.');
const json = args.includes('--json');

const SKIP = new Set(['node_modules', 'release', 'dist', 'templates']);
function walk(dir)
{
    const out = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true }))
    {
        if (SKIP.has(e.name) || e.name.startsWith('.')) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...walk(p));
        else out.push(p);
    }
    return out;
}
const all = walk(root).sort();
const rel = (p)=> path.relative(root, p).split(path.sep).join('/');
const read = (p)=> fs.readFileSync(p, 'utf8');
const isCode = (p)=> /\.m?js$/.test(p);
const code = all.filter(isCode);
const source = new Map(code.map(f => [f, read(f)]));

// strip comments so a commented-out import doesn't count as a use
const stripComments = (s)=> s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\\])\/\/.*$/gm, '$1');

const resolve = (from, spec)=>
{
    if (!spec.startsWith('.') && !spec.startsWith('/')) return;
    const base = spec.startsWith('/') ? path.join(root, spec) : path.resolve(path.dirname(from), spec);
    for (const p of [base, base + '.js', path.join(base, 'index.js')])
        if (source.has(p)) return p;
};

// imports: [{ target, names: Set | '*' }]; names is '*' for namespace imports, re-export-all and dynamic import()
const importRe = /(?:^|[\s;])(import|export)\s*([\s\S]*?)\s*from\s*['"]([^'"]+)['"]|(?:^|[\s;])import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
const imports = new Map();
for (const f of code)
{
    const list = [];
    for (const m of stripComments(source.get(f)).matchAll(importRe))
    {
        const spec = m[3] ?? m[4] ?? m[5];
        const target = resolve(f, spec);
        if (!target) continue;
        if (!m[3]) { list.push({ target, names: m[4] ? new Set() : '*' }); continue; }
        const clause = m[2];
        if (/\*/.test(clause)) { list.push({ target, names: '*' }); continue; }
        const names = new Set();
        const braces = clause.match(/\{([\s\S]*)\}/);
        if (braces) for (const part of braces[1].split(','))
        {
            const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
            if (name) names.add(name);
        }
        const outside = clause.replace(/\{[\s\S]*\}/, '').replace(/,/g, ' ').trim();
        if (m[1] === 'import' && outside) names.add('default');
        list.push({ target, names });
    }
    imports.set(f, list);
}

// entry points
const pages = all.filter(p => p.endsWith('.html'));
const gameEntries = [];
for (const page of pages)
    for (const m of read(page).matchAll(/<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']+)["']/g))
    {
        const p = path.resolve(path.dirname(page), m[1]);
        if (source.has(p)) gameEntries.push(p);
    }
for (const page of pages)   // inline module scripts that import the game's files
    for (const m of read(page).matchAll(/<script\b[^>]*\btype=["']module["'][^>]*>([\s\S]*?)<\/script>/g))
        for (const s of m[1].matchAll(/from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g))
        {
            const p = resolve(page, s[1] ?? s[2]);
            if (p) gameEntries.push(p);
        }
const under = (dir)=> code.filter(f => rel(f).startsWith(dir + '/'));
const otherEntries = [...under('test'), ...under('tests'), ...under('tools'), ...under('scripts'), ...under('electron')];

const reach = (entries)=>
{
    const seen = new Set(), stack = [...entries];
    while (stack.length)
    {
        const f = stack.pop();
        if (seen.has(f)) continue;
        seen.add(f);
        for (const i of imports.get(f) ?? []) stack.push(i.target);
    }
    return seen;
};
const byGame = reach(gameEntries);
const byOther = reach(otherEntries);

const unreached = code.filter(f => !byGame.has(f) && !byOther.has(f));
const onlyOther = code.filter(f => !byGame.has(f) && byOther.has(f) && !otherEntries.includes(f));

// exports of game modules, and who imports each
const exportsOf = (s)=>
{
    const names = new Set();
    s = stripComments(s);
    for (const m of s.matchAll(/export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([\w$]+)/g)) names.add(m[1]);
    for (const m of s.matchAll(/export\s+(?:const|let|var)\s*\{([^}]*)\}/g))
        for (const n of m[1].split(',')) { const k = n.split(':').pop().trim(); if (k) names.add(k); }
    for (const m of s.matchAll(/export\s*\{([^}]*)\}(?!\s*from)/g))
        for (const n of m[1].split(',')) { const k = n.trim().split(/\s+as\s+/).pop().trim(); if (k) names.add(k); }
    if (/export\s+default\b/.test(s)) names.add('default');
    return names;
};
const usedBy = (target, files)=>
{
    const names = new Set();
    for (const f of files)
        for (const i of imports.get(f) ?? [])
            if (i.target === target)
            {
                if (i.names === '*') return '*';
                for (const n of i.names) names.add(n);
            }
    return names;
};
const gameFiles = [...byGame], otherFiles = [...byOther];
const unusedExports = [], testOnlyExports = [];
for (const f of byGame)
{
    if (gameEntries.includes(f)) continue;
    const game = usedBy(f, gameFiles);
    if (game === '*') continue;
    const other = usedBy(f, otherFiles);
    for (const name of exportsOf(source.get(f)))
    {
        if (game.has(name)) continue;
        if (other === '*') unusedExports.push(`${rel(f)}: ${name} (a test or tool loads the whole module)`);
        else if (other.has(name)) testOnlyExports.push(`${rel(f)}: ${name}`);
        else unusedExports.push(`${rel(f)}: ${name}`);
    }
}

// assets no text file names
const ASSET = /\.(png|jpe?g|gif|webp|avif|svg|mp3|ogg|wav|m4a|flac|ttf|otf|woff2?|glb|gltf|obj|json|webm|mp4)$/i;
const CONFIG = new Set(['package.json', 'package-lock.json', 'jsconfig.json', 'tsconfig.json', 'architecture.json', 'manifest.json']);
const assets = all.filter(p => ASSET.test(p) && !CONFIG.has(rel(p)) && !rel(p).startsWith('docs/'));
const texts = all.filter(p => /\.(m?js|cjs|html|css|json|webmanifest|md)$/i.test(p));
const docText = texts.filter(p => p.endsWith('.md')).map(read).join('\n');
const liveText = texts.filter(p => !p.endsWith('.md')).map(read).join('\n');
const unnamedAssets = [], docOnlyAssets = [];
for (const a of assets)
{
    const name = path.basename(a);
    if (liveText.includes(name)) continue;
    (docText.includes(name) ? docOnlyAssets : unnamedAssets).push(rel(a));
}

const report = {
    entries: gameEntries.map(rel),
    unreachedModules: unreached.map(rel),
    modulesOnlyTestsOrToolsReach: onlyOther.map(rel),
    unusedExports,
    exportsOnlyTestsImport: testOnlyExports,
    assetsNothingNames: unnamedAssets,
    assetsOnlyDocsName: docOnlyAssets,
};

if (json) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }
if (!gameEntries.length) console.log('No <script type="module" src> found in any .html file; every module will look unreached.\n');
console.log(`Entry points: ${report.entries.join(', ') || 'none'}\n`);
const section = (title, list, hint)=>
{
    console.log(`${title} (${list.length})${list.length && hint ? `: ${hint}` : ''}`);
    for (const x of list) console.log(`  ${x}`);
    console.log('');
};
section('Modules nothing imports', report.unreachedModules, 'dead unless loaded by a path built at run time');
section('Modules only tests or tools reach', report.modulesOnlyTestsOrToolsReach, 'the game never loads them');
section('Exports nothing imports', report.unusedExports, 'drop the export, or the code if the file doesn\'t use it either');
section('Exports only tests import', report.exportsOnlyTestsImport, 'tested, but the game never calls them');
section('Assets no code, page, style or manifest names', report.assetsNothingNames, 'check for names built at run time');
section('Assets only docs name', report.assetsOnlyDocsName, 'screenshots and the like; dead if the doc is');
