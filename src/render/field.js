// The play field, drawn with the 2D canvas in field units (1280 × 720, y down, as the rules use) under a transform the
// caller sets. Back to front: the deadly edge and its frame, hazards, reach rings, anchor rings, tether, motes, trail, 1UP ring,
// comet, crash flash. Thin lines and flat colours, nothing glowing. The dev rooms can switch the colours to a check view.
import { CONFIG, SCREEN } from '../world/comet-data.js';
import { border } from '../world/hazards.js';
import { isLive, latchRange, latchTarget, swingWarn } from '../player/comet.js';
import { LIFE_FLASH } from '../world/motes.js';
import { setting } from '../game/settings.js';
import { invulnerable } from '../world/sim.js';
import { C as GAME, VIEWS } from './palette.js';

const W = SCREEN.w, H = SCREEN.h;

const rgb = (hex)=> [1, 3, 5].map((i)=> parseInt(hex.slice(i, i + 2), 16));

// the check view the dev rooms draw in ('' is the game's own look); see VIEWS in palette.js
let view = '';
/** @param {string} name '', 'gray', 'silhouette' or 'blackout' */
export function setFieldView(name) { view = name in VIEWS ? name : ''; }
export const fieldView = ()=> view;
// what the field is drawn on in the current view
export const fieldBackdrop = ()=> view ? VIEWS[view].backdrop : '#000000';
const mixColour = (a, b, t)=> `rgb(${a.map((v, i)=> Math.round(v + (b[i] - v) * t)).join(',')})`;

// four bars, t thick, just inside the rectangle (x, y, w, h)
function outline(g, x, y, w, h, t)
{
    g.fillRect(x, y, w, t); g.fillRect(x, y + h - t, w, t);
    g.fillRect(x, y + t, t, h - 2 * t); g.fillRect(x + w - t, y + t, t, h - 2 * t);
}
function disc(g, x, y, r)
{
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
}
function segment(g, x0, y0, x1, y1)
{
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
}

export function drawField(g, w)
{
    const C = view ? VIEWS[view] : GAME, TETHER = rgb(C.tether), RED = rgb(C.hazard);
    const t = w.t, p = w.player, r = CONFIG.playerRadius;
    const calm = setting('a11y.reduceFlashing');
    const b = border(t);
    if (b > 0)
    {
        g.fillStyle = C.lethal;
        g.fillRect(0, 0, W, b); g.fillRect(0, H - b, W, b); g.fillRect(0, b, b, H - 2 * b); g.fillRect(W - b, b, b, H - 2 * b);
    }
    g.fillStyle = C.frame;
    outline(g, b, b, W - 2 * b, H - 2 * b, 2);

    g.fillStyle = C.hazard;
    for (const h of w.hazards) g.fillRect(h.x, h.y, h.w, h.h);

    if (!p.latched && w.life === 'active') reachRings(g, w, C);

    // rings 2 wide, out to the anchor's radius
    g.lineWidth = 2;
    for (const a of w.anchors)
    {
        g.strokeStyle = isLive(a, t) ? C.anchor : C.dormant;
        g.beginPath(); g.arc(a.x, a.y, CONFIG.anchorRadius - 1, 0, Math.PI * 2); g.stroke();
    }

    if (p.latched && p.anchor >= 0)
    {
        const a = w.anchors[p.anchor], warn = swingWarn(w);
        // calm blue until halfway to snapping, then red, blinking faint near the end (steady with Reduce flashing)
        const red = warn <= .5 ? 0 : (warn - .5) / .5;
        g.strokeStyle = mixColour(TETHER, RED, red);
        g.globalAlpha = warn >= .85 && !calm && Math.floor(t * 16) % 2 === 1 ? .2 : 1;
        g.lineWidth = 1 + red;
        segment(g, p.x, p.y, a.x, a.y);
        g.globalAlpha = 1;
    }

    g.fillStyle = C.mote;
    for (const m of w.motes) if (m.active) disc(g, m.x, m.y, CONFIG.moteRadius);

    // while crashed the comet is gone until a press brings it back
    const alive = w.life !== 'dead';
    if (alive)
    {
        // the trail: oldest faint and thin, newest solid
        const tr = p.trail, n = tr.length / 2;
        g.strokeStyle = C.trail;
        for (let i = 0; i < n - 1; i++)
        {
            const f = (i + 1) / n;
            g.globalAlpha = f;
            g.lineWidth = 1 + 3 * f;
            segment(g, tr[i * 2], tr[i * 2 + 1], tr[i * 2 + 2], tr[i * 2 + 3]);
        }
        g.globalAlpha = 1;

        // the 1UP pulse: a ring 3 wide growing out from the comet as it fades
        if (w.lifeFlash > 0)
        {
            const f = w.lifeFlash / LIFE_FLASH, rad = r + 2 + (1 - f) * 28;
            g.fillStyle = C.mote;
            g.globalAlpha = f * .55;
            disc(g, p.x, p.y, r + 3);
            g.strokeStyle = C.mote;
            g.lineWidth = 3;
            g.globalAlpha = f;
            g.beginPath(); g.arc(p.x, p.y, rad - 1.5, 0, Math.PI * 2); g.stroke();
            g.globalAlpha = 1;
        }

        // blinking while it can't be hurt (half bright with Reduce flashing), with a soft white halo on a perfect
        const safe = invulnerable(w);
        if (!(safe && !calm && Math.floor(t * 24) % 2 === 1))
        {
            g.fillStyle = C.comet;
            if (w.perfectFlash > 0)
            {
                g.globalAlpha = .5;
                disc(g, p.x, p.y, r + 4);
                g.globalAlpha = 1;
            }
            if (safe && calm) g.globalAlpha = .5;
            disc(g, p.x, p.y, r);
            g.globalAlpha = 1;
        }
    }

    // a fresh crash flashes the screen's edge, half as bright with Reduce flashing
    if (w.crashFlash > 0)
    {
        g.fillStyle = C.crash;
        g.globalAlpha = w.crashFlash / 8 * (calm ? .5 : 1);
        outline(g, 0, 0, W, H, 16);
        g.globalAlpha = 1;
    }
}

// While the comet flies, a ring around each live anchor at the latch reach: the comet inside it can latch. The colour
// runs green to orange to red and the line breaks into ever shorter dashes as the comet nears the edge of the reach;
// past it the ring is faint red dots that fade away. The anchor a hold would take now is drawn bold.
function reachRings(g, w, C)
{
    const p = w.player, range = latchRange(w.t, w.cfg);
    const target = latchTarget(w, w.t, w.aim ?? { x: 0, y: 0 });
    const NEAR = rgb(C.reachNear), EDGE = rgb(C.reachEdge), OUT = rgb(C.reachOut);
    w.anchors.forEach((a, i)=>
    {
        if (!isLive(a, w.t)) return;
        const k = Math.hypot(a.x - p.x, a.y - p.y) / range;
        if (k >= REACH_FADE) return;
        const near = Math.min(1, Math.max(0, (k - .5) / .5));      // 0 well in reach, 1 at its edge
        g.strokeStyle = k > 1 ? C.reachOut : near < .6 ? mixColour(NEAR, EDGE, near / .6) : mixColour(EDGE, OUT, (near - .6) / .4);
        g.globalAlpha = k > 1 ? .35 * (REACH_FADE - k) / (REACH_FADE - 1) : i === target ? .75 : .35;
        g.lineWidth = i === target ? 1.5 : 1;
        // solid while well in reach, then dashes shrinking from 18 to 2 and gaps growing to 10
        const dash = k > 1 ? [3, 9] : near < .2 ? [] : [18 - 16 * (near - .2) / .8, 10 * (near - .2) / .8];
        g.setLineDash(dash);
        g.beginPath(); g.arc(a.x, a.y, range, 0, Math.PI * 2); g.stroke();
    });
    g.setLineDash([]);
    g.globalAlpha = 1;
}
const REACH_FADE = 1.5;     // past this share of the reach, no ring
