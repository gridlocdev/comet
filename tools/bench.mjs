#!/usr/bin/env node
// Frame rate of the game in Playwright's pinned Firefox (or Chromium/WebKit): headless, muted, a fresh profile.
// The browser build comes from the playwright version in package.json, so every machine measures the same browser.
//
//   node tools/bench.mjs [run ...] [options]          (just bench ...)
//
// Each run is "query" or "query|js". The query is added to the game's url ("" or "-" for none; ?mute is always added).
// The js is the body of an async function run in the page after it settles and before the frames are timed: inject a
// style, swap a module's function, turn a pass off. What it returns is printed.
//   just bench "" "debug&shot=play" "debug&shot=bot"
//   just bench "debug&shot=bot|window.game.clock.speed = 2"
//
// Options:
//   --browser B     firefox, chromium or webkit                                                  (default firefox)
//   --repeat N      run the whole list N times, interleaved (A B C A B C), to see past noise      (default 1)
//   --fresh         a new browser for every run, so nothing builds up between page loads
//   --size WxH      window size in CSS pixels                                                     (default 1440x900)
//   --dpr N         device pixel ratio, as a retina laptop has                                    (default 2)
//   --settle S      seconds to wait after loading, before the js and the timing                   (default 4)
//   --seconds S     seconds of frames to time                                                     (default 5)
//   --shots DIR     save a screenshot of each run there (after timing)
//   --url URL       measure a server that is already running instead of serving this folder
//
// Prints, per run: average fps, median and 95th-percentile frame time, and the canvas's backing size, and any page
// errors and console errors as they happen.
// Setup once: npm install && npx playwright install firefox
import { createServer } from 'node:http';
import { createReadStream, mkdirSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { firefox, chromium, webkit } from 'playwright';

const argv = process.argv.slice(2);
const opts = { browser: 'firefox', repeat: 1, fresh: false, size: '1440x900', dpr: '2', settle: 4, seconds: 5, shots: null, url: null };
const list = [];
for (let i = 0; i < argv.length; i++)
{
    const a = argv[i];
    if (a === '--fresh') opts.fresh = true;
    else if (a.startsWith('--')) opts[a.slice(2)] = argv[++i];
    else list.push(a);
}
const runs = (list.length ? list : ['']).map((spec)=>
{
    const bar = spec.indexOf('|');
    return { query: (bar < 0 ? spec : spec.slice(0, bar)).replace(/^-$/, ''), js: bar < 0 ? '' : spec.slice(bar + 1) };
});
const order = [];
for (let r = 0; r < +opts.repeat; r++) order.push(...runs);
const [width, height] = opts.size.split('x').map(Number);
if (opts.shots) mkdirSync(opts.shots, { recursive: true });

// a static server for this folder on a free port, unless --url names one
const root = resolve(import.meta.dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.webp': 'image/webp' };
let server = null, base = opts.url;
if (!base)
{
    server = createServer((req, res)=>
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
    base = `http://127.0.0.1:${server.address().port}/`;
}

// headless always, and muted: Firefox by its volume pref, Chromium by flag; the game's ?mute covers WebKit
const engines = { firefox, chromium, webkit };
const launch = ()=> engines[opts.browser].launch({
    headless: true,
    firefoxUserPrefs: opts.browser === 'firefox' ? { 'media.volume_scale': '0.0' } : undefined,
    args: opts.browser === 'chromium' ? ['--mute-audio', '--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] : [],
});
const open = async (browser)=>
{
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: +opts.dpr });
    const page = await context.newPage();
    page.on('pageerror', (e)=> console.log('  page error:', e.message));
    page.on('console', (m)=> { if (m.type() === 'error') console.log('  console error:', m.text()); });
    return page;
};

const TIME_FRAMES = (seconds)=> new Promise((done)=>
{
    const t = []; let last = performance.now(); const end = last + seconds * 1000;
    const f = (now)=>
    {
        t.push(now - last); last = now;
        if (now < end) { requestAnimationFrame(f); return; }
        t.sort((a, b)=> a - b);
        const mean = t.reduce((a, b)=> a + b, 0) / t.length, c = document.querySelector('canvas');
        done({ fps: 1000 / mean, p50: t[t.length >> 1], p95: t[Math.floor(t.length * .95)], canvas: c ? `${c.width}x${c.height}` : '-' });
    };
    requestAnimationFrame(f);
});

let browser = null, page = null, shown = false;
try
{
    for (const [n, run] of order.entries())
    {
        if (!browser || opts.fresh) { await browser?.close(); browser = await launch(); page = await open(browser); }
        const query = [run.query, 'mute'].filter(Boolean).join('&');
        await page.goto(base + (base.includes('?') ? '&' : '?') + query);
        if (!shown)
        {
            shown = true;
            const gpu = await page.evaluate(()=>
            {
                const c = document.createElement('canvas'), gl = c.getContext('webgl2') ?? c.getContext('webgl');
                if (!gl) return 'no WebGL';
                const e = gl.getExtension('WEBGL_debug_renderer_info');
                return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
            });
            console.log(`# ${opts.browser} ${browser.version()}, ${opts.size} at dpr ${opts.dpr}\n# GPU: ${gpu}  (a software renderer such as llvmpipe or SwiftShader makes the numbers meaningless)`);
        }
        await page.waitForTimeout(opts.settle * 1000);
        let note = '';
        if (run.js)
        {
            try
            {
                const v = await page.evaluate(`(async()=>{ ${run.js} })()`);
                if (v !== undefined && v !== null) note = '  -> ' + (typeof v === 'string' ? v : JSON.stringify(v));
            }
            catch (e) { note = '  -> exception: ' + e.message.split('\n')[0]; }
        }
        const r = await page.evaluate(TIME_FRAMES, +opts.seconds);
        const label = (run.query || '(title)') + (run.js ? ` | ${run.js.replace(/\s+/g, ' ').slice(0, 40)}` : '');
        console.log(`${label.padEnd(64)} fps ${r.fps.toFixed(1).padStart(5)}  p50 ${r.p50.toFixed(1).padStart(5)}ms  p95 ${r.p95.toFixed(1).padStart(5)}ms  canvas ${r.canvas}${note}`);
        if (opts.shots) await page.screenshot({ path: join(opts.shots, `${String(n + 1).padStart(2, '0')}-${(run.query || 'title').replace(/[^a-z0-9]+/gi, '_').slice(0, 50)}.png`) });
    }
}
finally
{
    await browser?.close();
    server?.close();
}
