// Comet's picture, drawn each frame with the 2D canvas on its 1280 × 720 field, with y down as the rules use. The
// engine letterboxes the canvas and scales it to the screen's real pixels. It keeps the first version's look: a black
// field, flat colours, thin lines and a blocky pixel font, nothing glowing. Words (HUD, messages, prompt) sit on their
// own canvases at the screen's resolution, every font pixel snapped to whole device pixels, and are redrawn only when
// their text changes.
import { MOBILE, fitSurface, surface } from '../../platform/engine.js';
import { pixelCentre, pixelText, pixelWidth } from '../../ui/pixel-text.js';
import { CONFIG, SCREEN, border, mult } from './comet-data.js';
import { LIFE_FLASH, invulnerable, isLive, motesToNextLife, score, swingWarn } from './sim.js';

const W = SCREEN.w, H = SCREEN.h;
fitSurface(W, H);

// the original palette
const C = {
    lethal: '#3a0e0e', frame: '#1e2a38', hazard: '#ff3355',
    anchor: '#33ccff', dormant: '#1a4456', tether: '#88e0ff',
    mote: '#ffe066', trail: '#b8e8ff', comet: '#ffffff',
    white: '#ffffff', dim: '#9fb4c7', muted: '#6f8090', gold: '#ffe066',
    accent: '#33ccff', red: '#ff6677', crash: '#ff3355',
};

// ---- words in the pixel font: the HUD along the top, a message in the middle, and a blinking prompt.
// Each layer covers the field's width and h of its rows, at the surface's resolution.
const layer = (h)=>
{
    const canvas = document.createElement('canvas');
    return { canvas, g: /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d')), h, key: '' };
};
const hudLayer = layer(112), msgLayer = layer(500), promptLayer = layer(32);
const MSG_TOP = 180;
let S = 1, sizedFor = -1;

// on a resize, the layers match the new resolution and redraw
function sizeLayers()
{
    if (sizedFor === surface.version) return;
    sizedFor = surface.version;
    S = surface.scale;
    for (const l of [hudLayer, msgLayer, promptLayer])
    {
        l.canvas.width = surface.canvas.width;
        l.canvas.height = Math.ceil(l.h * S);
        l.key = '';
    }
}

// lines of words in field units, scaled to the layer's pixels
const text = (g, str, x, y, size, fill)=> pixelText(g, str, x * S, y * S, size * S, fill);
const centre = (g, str, y, size, fill)=> pixelCentre(g, str, W / 2 * S, y * S, size * S, fill);
const rightAt = (g, str, x, y, size, fill)=> pixelText(g, str, x * S - pixelWidth(str, size * S), y * S, size * S, fill);
function dot(g, x, y, r, fill)
{
    g.fillStyle = fill;
    g.beginPath(); g.arc(x * S, y * S, r * S, 0, Math.PI * 2); g.fill();
}

let hudAge = 99, hudLives = -1;
function drawHud(w, hi)
{
    const s = score(w), lives = w.lives;
    const key = `${s}|${hi}|${lives}|${w.earnedLives}|${w.chain}|${motesToNextLife(w)}|${Math.floor(w.t)}`;
    hudAge++;
    // the score ticks every step: redraw about 15 times a second, but at once when a life comes or goes
    if (key === hudLayer.key || (hudAge < 4 && lives === hudLives && hudLayer.key)) return;
    hudLayer.key = key; hudAge = 0; hudLives = lives;
    const g = hudLayer.g;
    g.clearRect(0, 0, hudLayer.canvas.width, hudLayer.canvas.height);
    text(g, `SCORE ${s}`, 24, 18, 32, C.white);
    centre(g, `HI ${hi}`, 22, 20, C.dim);
    // one dot a life; the ones earned from motes are yellow
    for (let i = 0; i < lives; i++) dot(g, 1256 - i * 16, 26, 8, i >= lives - w.earnedLives ? C.mote : C.white);
    const k = mult(w.chain);
    text(g, `x${k.toFixed(1)}`, 24, 56, 24, k > 1 ? C.gold : C.muted);
    dot(g, 32, 96, 5, C.mote);
    text(g, `${motesToNextLife(w)} TO 1UP`, 44, 88, 18, C.dim);
    const secs = Math.floor(w.t);
    rightAt(g, `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, 1256, 52, 16, C.muted);
}

// where each message's blinking prompt goes, and how big
const PROMPT_AT = { title: [470, 30], crashed: [380, 28], over: [500, 30] };

// title, crash and game-over words; the key says what's shown so it's only drawn when that changes
function drawMessage(kind, info = {})
{
    const key = `${kind}|${JSON.stringify(info)}`;
    if (key === msgLayer.key) return;
    msgLayer.key = key;
    const g = msgLayer.g;
    g.clearRect(0, 0, msgLayer.canvas.width, msgLayer.canvas.height);
    const line = (str, y, size, fill)=> centre(g, str, y - MSG_TOP, size, fill);
    if (kind === 'title')
    {
        line('COMET', 240, 96, C.white);
        line('hold to swing · release to fly', 330, 22, C.dim);
        line(`HI ${info.hi}`, 540, 22, C.dim);
        line('1P', 600, 18, C.muted);
    }
    else if (kind === 'crashed')
    {
        line('YOU CRASHED', 300, 48, C.red);
        line('your comet waits at center, then drifts back in', 430, 18, C.dim);
    }
    else if (kind === 'over')
    {
        line('GAME OVER', 200, 72, C.red);
        line(`SCORE ${info.score}`, 320, 40, C.white);
        if (info.best) line('NEW HIGH!', 380, 30, C.gold);
        line(`HI ${info.hi}`, 430, 22, C.dim);
    }
}

function drawPrompt(str, kind)
{
    const size = (PROMPT_AT[kind] ?? PROMPT_AT.title)[1];
    const key = `${str}|${size}`;
    if (key === promptLayer.key) return;
    promptLayer.key = key;
    const g = promptLayer.g;
    g.clearRect(0, 0, promptLayer.canvas.width, promptLayer.canvas.height);
    if (str) centre(g, str, 0, size, C.accent);
}

// the prompt for the device last used
export function pressWord(padUsed)
{
    if (MOBILE) return 'TAP SWING';
    return padUsed ? 'PRESS A' : 'PRESS SPACE';
}

// ---- the field, back to front: the deadly edge and its frame, hazards, anchors, tether, motes, trail, comet
const rgb = (hex)=> [1, 3, 5].map((i)=> parseInt(hex.slice(i, i + 2), 16));
const TETHER = rgb(C.tether), RED = rgb(C.hazard);
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

function drawField(g, w)
{
    const t = w.t, p = w.player, r = CONFIG.playerRadius;
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
        // calm blue until halfway to snapping, then red, blinking faint near the end
        const red = warn <= .5 ? 0 : (warn - .5) / .5;
        g.strokeStyle = mixColour(TETHER, RED, red);
        g.globalAlpha = warn >= .85 && Math.floor(t * 16) % 2 === 1 ? .2 : 1;
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

        // blinking while it can't be hurt, with a soft white halo on a perfect
        if (!(invulnerable(w) && Math.floor(t * 24) % 2 === 1))
        {
            g.fillStyle = C.comet;
            if (w.perfectFlash > 0)
            {
                g.globalAlpha = .5;
                disc(g, p.x, p.y, r + 4);
                g.globalAlpha = 1;
            }
            disc(g, p.x, p.y, r);
        }
    }

    // a fresh crash flashes the screen's edge
    if (w.crashFlash > 0)
    {
        g.fillStyle = C.crash;
        g.globalAlpha = w.crashFlash / 8;
        outline(g, 0, 0, W, H, 16);
        g.globalAlpha = 1;
    }
}

let clock = 0;

// draw a frame. ui: { field, hud, message, info, prompt, hi }
export function render(w, ui, dt)
{
    clock += dt;
    sizeLayers();
    const g = surface.g;
    g.setTransform(S, 0, 0, S, 0, 0);
    g.globalAlpha = 1;
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    if (ui.field) drawField(g, w);

    // the words, in device pixels so their font pixels stay on whole pixels
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (ui.hud)
    {
        drawHud(w, ui.hi);
        g.drawImage(hudLayer.canvas, 0, 0);
    }
    drawMessage(ui.message, ui.info);
    if (ui.message) g.drawImage(msgLayer.canvas, 0, Math.round(MSG_TOP * S));
    drawPrompt(ui.prompt, ui.message);
    if (ui.prompt && Math.floor(clock * 2) % 2 === 0)
        g.drawImage(promptLayer.canvas, 0, Math.round((PROMPT_AT[ui.message] ?? PROMPT_AT.title)[0] * S));
}
