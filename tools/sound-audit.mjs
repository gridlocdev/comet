// Every place a sound effect is played, next to the sentence it was made for, and the events that have none.
//   node tools/sound-audit.mjs   (just sounds runs it)
// by sound      each sound's `says`, then every call that plays it: a sound played from several places is listed
//               with REVIEW, to check its sentence fits each one
// undefined     a call names a sound sfx-defs.js doesn't have (exits 1)
// unplayed      a definition no call names: unused, or played through a variable (check by hand)
// dynamic       a call whose name isn't a literal: check by hand which sounds it can play
// table         rows of docs/sound.md's table with no sound yet, and sounds missing from the table
// Comet's field is one screen with no camera, so no sound takes a position.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { SFX_DEFS } from '../src/audio/sfx-defs.js';

const ROOT = join(import.meta.dirname, '..');
const files = (dir)=> readdirSync(dir, { withFileTypes: true }).flatMap((e)=>
    e.isDirectory() ? files(join(dir, e.name)) : /\.js$/.test(e.name) ? [join(dir, e.name)] : []);

const calls = [], dynamic = [];
for (const file of files(join(ROOT, 'src')))
{
    const rel = relative(ROOT, file);
    if (rel.startsWith(join('src', 'audio'))) continue;
    readFileSync(file, 'utf8').split('\n').forEach((line, i)=>
    {
        for (const m of line.matchAll(/sfx\.(?:play|loop)\(\s*(?:(['"])([\w-]+)\1|([^'"\s)][^,)]*))/g))
        {
            const at = `${rel}:${i + 1}`, text = line.trim().slice(0, 140);
            if (m[3]) dynamic.push({ at, text });
            else calls.push({ name: m[2], at, file: rel, text });
        }
    });
}

const byName = Map.groupBy(calls, (c)=> c.name);
console.log('== by sound');
for (const [name, list] of [...byName].sort())
{
    const def = SFX_DEFS[name];
    const review = new Set(list.map((c)=> c.file)).size > 1 || list.length > 2 ? '  REVIEW: does the sentence fit each?' : '';
    console.log(`\n${name}${review}\n  says: ${def?.says ?? '(not defined)'}`);
    for (const c of list) console.log(`  ${c.at}  ${c.text}`);
}

const undefinedNames = [...byName.keys()].filter((n)=> !SFX_DEFS[n]);
const unplayed = Object.keys(SFX_DEFS).filter((n)=> !byName.has(n));
const section = (title, rows)=> { if (rows.length) console.log(`\n== ${title}\n${rows.map((r)=> `  ${r}`).join('\n')}`); };
section('undefined', undefinedNames.map((n)=> `${n}: ${byName.get(n).map((c)=> c.at).join(', ')}`));
section('unplayed', unplayed);
section('dynamic', dynamic.map((d)=> `${d.at}  ${d.text}`));

// docs/sound.md's table: the Sound column holds `name`s, or "none" for an event left silent on purpose
const doc = join(ROOT, 'docs', 'sound.md');
if (existsSync(doc))
{
    const rows = readFileSync(doc, 'utf8').split('\n').filter((l)=> l.startsWith('|')).map((l)=> l.split('|').slice(1, -1).map((c)=> c.trim()));
    const head = rows.find((r)=> r.includes('Sound') && r.includes('Event'));
    if (head)
    {
        const col = head.indexOf('Sound'), body = rows.filter((r)=> r !== head && !/^-+$/.test(r[0]) && r[0] !== 'Event');
        const listed = new Set(body.flatMap((r)=> [...(r[col] ?? '').matchAll(/`([\w-]+)`/g)].map((m)=> m[1])));
        section('table: events with no sound yet', body.filter((r)=> !(r[col] ?? '').replace(/none/i, 'x').trim()).map((r)=> r[0]));
        section('table: sounds not in the table', Object.keys(SFX_DEFS).filter((n)=> !listed.has(n)));
        section('table: names not defined', [...listed].filter((n)=> !SFX_DEFS[n]));
    }
}

if (undefinedNames.length) process.exit(1);
