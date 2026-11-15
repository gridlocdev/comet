#!/usr/bin/env node
// Smoke run through the dev rooms in Playwright's pinned Firefox, headless and muted: every room loads with no page
// error, every gym case behaves as its band says through the real rules, every museum exhibit reaches its check, and
// every zoo group draws in every check view. Exits 1 on any failure.
//
//   node tools/rooms.mjs [--shots DIR]          (just rooms)
//
// --shots DIR saves a screenshot of each page there, to look over by eye.
// Setup once: npm install && npx playwright install firefox
import { createServer } from 'node:http';
import { createReadStream, mkdirSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { firefox } from 'playwright';

const argv = process.argv.slice(2);
const shots = argv.includes('--shots') ? argv[argv.indexOf('--shots') + 1] : null;
if (shots) mkdirSync(shots, { recursive: true });

// what to visit: the query, the most seconds to give it, and the check that must come back null
const VIEWS = ['', 'gray', 'silhouette', 'blackout'];
const PAGES = [
    { query: 'debug&room=hub', wait: 1, check: 'room.links.length > 0 ? null : "no links"' },
    ...['latch', 'swing', 'perfect'].map((row)=> ({ query: `debug&room=gym&row=${row}&bot`, wait: 8,
        check: `(()=>{ const r = room.verdicts().find((v)=> v.row === '${row}'), bad = r.cases.filter((c)=> !c.ok);
            const all = room.rows.find((x)=> x.id === '${row}').cases.length;
            return r.cases.length < all ? r.cases.length + ' of ' + all + ' cases finished' : bad.length ? bad.map((c)=> c.id + ' (' + c.band + ') ' + c.shown).join(', ') : null; })()` })),
    ...['field', 'sounds', 'colours'].flatMap((group)=> VIEWS.map((view)=> ({ query: `debug&room=zoo&group=${group}${view ? `&view=${view}` : ''}`, wait: 1,
        check: `room.group === '${group}' && room.items.length ? null : 'no items'` }))),
    ...['motion', 'closing', 'chain', 'lives'].map((exhibit)=> ({ query: `debug&room=museum&exhibit=${exhibit}&fast`, wait: 6,
        check: `(()=>{ const c = room.check(); return c.ok ? null : c.detail; })()` })),
];

// a static server for this folder on a free port
const root = resolve(import.meta.dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const server = createServer((req, res)=>
{
    let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (path.endsWith('/')) path += 'index.html';
    const file = join(root, path);
    try { if (!file.startsWith(root) || !statSync(file).isFile()) throw 0; }
    catch { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    createReadStream(file).pipe(res);
});
await new Promise((ok)=> server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await firefox.launch({ headless: true, firefoxUserPrefs: { 'media.volume_scale': '0.0' } });
let failed = 0;
try
{
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    let errors = [];
    page.on('pageerror', (e)=> errors.push(e.message));
    for (const [n, p] of PAGES.entries())
    {
        errors = [];
        await page.goto(`${base}?${p.query}&mute`);
        // ask the page every 100 ms until its check passes or the time is up (an exhibit that loops passes on the way)
        let problem = 'not loaded';
        for (const end = Date.now() + p.wait * 1000; Date.now() < end;)
        {
            await page.waitForTimeout(100);
            if (errors.length) { problem = `page error: ${errors.join('; ')}`; break; }
            try { problem = await page.evaluate(p.check); }
            catch (e) { problem = `check threw: ${e.message.split('\n')[0]}`; }
            if (!problem) break;
        }
        console.log(`${problem ? 'FAIL' : 'ok  '}  ${p.query}${problem ? `\n      ${problem}` : ''}`);
        if (problem) failed++;
        if (shots) await page.screenshot({ path: join(shots, `${String(n + 1).padStart(2, '0')}-${p.query.replace(/[^a-z0-9]+/gi, '_')}.png`) });
    }
}
finally
{
    await browser.close();
    server.close();
}
console.log(failed ? `\n${failed} of ${PAGES.length} failed` : `\nall ${PAGES.length} rooms ok`);
process.exit(failed ? 1 : 0);
