// The zoo (?debug&room=zoo&group=field|sounds|colours&item=<key>): every thing Comet draws, every sound and every
// colour, side by side. Field things are real worlds drawn by the real renderer at their real size, each with the
// comet beside it for scale; the focused one is also shown three times larger with its name, file and numbers.
// Arrows (pad d-pad) or a click move the focus; a sound plays when focused, and again on Space (A).
import { FLAGS, surface } from '../platform/engine.js';
import { input } from '../platform/input.js';
import { drawField, fieldView } from '../render/field.js';
import { sfx } from '../audio/sfx.js';
import { SFX_DEFS } from '../audio/sfx-defs.js';
import { CONFIG } from '../world/comet-data.js';
import { createWorld } from '../world/sim.js';
import { pushTrail, swingLimit } from '../player/comet.js';
import { LIFE_FLASH } from '../world/motes.js';
import { ZOO, ZOO_GROUPS } from './zoo-data.js';
import { frame, grid, label, roomBar, sign, toField } from './labels.js';

const COLS = 4, TW = 214, TH = 160;
const tileAt = (i)=> ({ x: 10 + (i % COLS) * 222, y: 40 + Math.floor(i / COLS) * 170, w: TW, h: TH });
const PANEL = { x: 910, y: 40, w: 360, h: 230 };
const OFF = [-500, -500];       // a world needs one anchor; this one is off screen

// a world for a field entry: the thing at (640, 360) and the comet beside it, still unless tick moves them
function fieldWorld(key)
{
    const level = { anchors: [OFF], motes: [] };
    if (key.startsWith('anchor') || key.startsWith('tether')) level.anchors = [[640, 360]];
    if (key === 'mote') level.motes = [[640, 360]];
    if (key === 'reach') level.anchors = [[560, 360], [760, 360]];
    const w = createWorld(CONFIG, level), p = w.player;
    Object.assign(p, { x: 690, y: 360, vx: 0, vy: 0, latched: false, anchor: -1, invulnUntil: 0 });
    p.trail.length = 0;
    w.life = 'active';
    let at = [660, 360], tick = null, zoom = 1;
    const swing = (warn)=> (time)=>
    {
        Object.assign(p, { latched: true, anchor: 0, r: 50, theta: time * 2, swept: warn * swingLimit() });
        p.x = 640 + 50 * Math.cos(p.theta); p.y = 360 + 50 * Math.sin(p.theta);
        w.t = .01 + time % 1;       // the blink runs on the run's clock; kept under 1 s, the edge stays off screen
    };
    switch (key)
    {
        case 'comet': at = [640, 360]; tick = (time)=> { p.x = 640 + 40 * Math.cos(time * 4); p.y = 360 + 40 * Math.sin(time * 4); pushTrail(w); }; break;
        case 'anchorResting': w.anchors[0].dormantUntil = Infinity; break;
        case 'tether': at = [640, 360]; tick = swing(0); break;
        case 'tetherStrain': at = [640, 360]; tick = swing(.7); break;
        case 'tetherSnap': at = [640, 360]; tick = swing(.95); break;
        case 'hazard': w.hazards = [{ x: 608, y: 354, w: CONFIG.hazardW, h: CONFIG.hazardH }]; p.x = 700; break;
        case 'edge': w.t = 100; p.x = 160; p.y = 160; at = [110, 110]; break;
        case 'oneUp': at = [690, 360]; tick = (time)=> { w.lifeFlash = LIFE_FLASH - Math.floor(time * 60) % LIFE_FLASH; }; break;
        case 'perfect': at = [690, 360]; w.perfectFlash = 6; break;
        case 'safe': at = [690, 360]; p.invulnUntil = Infinity; tick = (time)=> { w.t = .01 + time % 1; }; break;
        // the comet drifts across two anchors and back, so each ring runs green to red and the bold one changes hands
        case 'reach': at = [660, 360]; zoom = .3; tick = (time)=> { p.x = 660 + 330 * Math.sin(time * .7); p.y = 420; p.vx = Math.cos(time * .7); }; break;
        case 'crash': p.x = 80; at = [60, 360]; tick = (time)=> { w.crashFlash = 8 - Math.floor(time * 12) % 12; }; break;
    }
    return { w, at, tick, zoom };
}

// a field world drawn into a box, its point `at` in the middle, `zoom` times its size
function drawWorld(g, fw, box, zoom)
{
    g.save();
    g.beginPath(); g.rect(box.x, box.y, box.w, box.h); g.clip();
    g.translate(box.x + box.w / 2, box.y + box.h / 2);
    g.scale(zoom * fw.zoom, zoom * fw.zoom);
    g.translate(-fw.at[0], -fw.at[1]);
    drawField(g, fw.w);
    g.restore();
}

// each sound's samples, worked out once, and its waveform drawn once per size into a bitmap: stroking a few
// thousand short lines every frame cost a third of the frame
const waves = {}, bitmaps = {};
function waveBitmap(key, w, h, scale)
{
    const d = waves[key] ??= SFX_DEFS[key].make();
    return bitmaps[`${key}:${w}:${h}:${scale}`] ??= (()=>
    {
        const c = document.createElement('canvas');
        c.width = Math.ceil(w * scale); c.height = Math.ceil(h * scale);
        const b = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
        b.scale(scale, scale);
        b.strokeStyle = '#88e0ff'; b.lineWidth = 1;
        b.beginPath();
        for (let i = 0; i < w; i++)
        {
            let lo = 0, hi = 0;
            for (let j = Math.floor(i * d.length / w); j < Math.floor((i + 1) * d.length / w); j++) { lo = Math.min(lo, d[j]); hi = Math.max(hi, d[j]); }
            b.moveTo(i + .5, h / 2 - hi * h / 2); b.lineTo(i + .5, h / 2 - lo * h / 2 + .5);
        }
        b.stroke();
        return c;
    })();
}
function drawWave(g, key, box)
{
    const w = Math.floor(box.w), h = Math.floor(box.h);
    g.drawImage(waveBitmap(key, w, h, g.getTransform().a), box.x, box.y, w, h);
    label(g, `${Math.round(waves[key].length / 44.1)} ms`, box.x + box.w - 4, box.y + 4, { size: 11, align: 'right', colour: '#7f93a6' });
}

function playSound(key)
{
    const def = SFX_DEFS[key];
    if (!def) return;
    if (def.loop) { sfx.loop(key, 1); setTimeout(()=> sfx.loop(key, 0), 1000); }
    else sfx.play(key);
}

export function zooRoom()
{
    let group = ZOO_GROUPS[0].id, items = [], focus = 0, time = 0;
    const worlds = {};
    const pick = (i, sound = true)=>
    {
        focus = Math.max(0, Math.min(items.length - 1, i));
        const q = new URLSearchParams(location.search); q.set('item', items[focus].key);
        history.replaceState(null, '', `?${q}`.replace('debug=&', 'debug&'));
        if (sound && group === 'sounds') playSound(items[focus].key);
    };
    const bar = roomBar({ pages: ZOO_GROUPS, param: 'group', onPage: (i)=>
    {
        group = ZOO_GROUPS[i].id;
        items = ZOO.filter((z)=> z.group === group);
        const want = items.findIndex((z)=> z.key === FLAGS.params.get('item'));
        pick(want < 0 ? 0 : want, false);
    } });
    for (const z of ZOO) if (z.group === 'field') worlds[z.key] = fieldWorld(z.key);
    surface.canvas.addEventListener('pointerdown', (e)=>
    {
        const f = toField(e.clientX, e.clientY);
        const i = items.findIndex((_, k)=> { const t = tileAt(k); return f.x >= t.x && f.x < t.x + t.w && f.y >= t.y && f.y < t.y + t.h; });
        if (i >= 0) pick(i);
    });
    Object.assign(window, { room: { name: 'zoo', groups: ZOO_GROUPS.map((z)=> z.id), get group() { return group; }, get items() { return items.map((z)=> z.key); } } });
    return {
        id: 'zoo',
        update(dt)
        {
            time += dt;
            bar.update();
            const dir = input.nav();
            if (dir === 'left') pick(focus - 1);
            if (dir === 'right') pick(focus + 1);
            if (dir === 'up') pick(focus - COLS);
            if (dir === 'down') pick(focus + COLS);
            if (input.confirm()) playSound(items[focus].key);
        },
        draw()
        {
            const g = frame();
            grid(g);
            items.forEach((z, i)=>
            {
                const t = tileAt(i);
                g.fillStyle = '#ffffff08'; g.fillRect(t.x, t.y, t.w, t.h);
                drawItem(g, z, { x: t.x, y: t.y, w: t.w, h: t.h - 22 }, 1);
                g.strokeStyle = i === focus ? '#33ccff' : '#ffffff20'; g.lineWidth = i === focus ? 2 : 1;
                g.strokeRect(t.x, t.y, t.w, t.h);
                label(g, z.name, t.x + t.w / 2, t.y + t.h - 18, { size: 12, colour: fieldView() === 'silhouette' ? '#16161c' : i === focus ? '#fff' : '#9fb4c7' });
            });
            const z = items[focus];
            g.fillStyle = '#ffffff08'; g.fillRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h);
            drawItem(g, z, PANEL, 2);
            sign(g, z.name, z.facts.join('\n'), PANEL.x, PANEL.y + PANEL.h + 10, PANEL.w, [`key: ${z.key}`, ...z.file.split(', ')]);
        },
        debug: ()=> ({ room: 'zoo', group, item: items[focus]?.key }),
    };

    function drawItem(g, z, box, zoom)
    {
        if (z.group === 'field')
        {
            const fw = worlds[z.key];
            fw.tick?.(time);
            drawWorld(g, fw, box, zoom);
        }
        else if (z.group === 'sounds') drawWave(g, z.key, { x: box.x + 8, y: box.y + 8, w: box.w - 16, h: box.h - 16 });
        else
        {
            g.fillStyle = z.facts[0]; g.fillRect(box.x + 12, box.y + 12, box.w - 24, box.h - 40);
            label(g, z.facts[0], box.x + box.w / 2, box.y + box.h - 22, { size: 12 });
        }
    }
}
