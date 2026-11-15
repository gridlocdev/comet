// The run's picture each frame: the field and the HUD from the shared layers, and the screens' own words (title,
// crashed, game over) with a blinking prompt, on layers at the screen's resolution, redrawn only
// when their text changes.
import { MOBILE, fitSurface, surface } from '../../platform/engine.js';
import { SCREEN } from '../../world/comet-data.js';
import { drawField } from '../../render/field.js';
import { C } from '../../render/palette.js';
import { drawHud } from '../../ui/hud.js';
import { centre, clear, fitLayer, wordLayer } from '../../ui/word-layer.js';

const W = SCREEN.w, H = SCREEN.h;
fitSurface(W, H);

const msgLayer = wordLayer(500), promptLayer = wordLayer(32);
const MSG_TOP = 180;

// where each message's blinking prompt goes, and how big
const PROMPT_AT = { title: [470, 30], crashed: [380, 28], over: [500, 30] };

// title, crash and game-over words; the key says what's shown so it's only drawn when that changes
function drawMessage(kind, info = {})
{
    const key = `${kind}|${JSON.stringify(info)}`;
    if (key === msgLayer.key) return;
    msgLayer.key = key;
    clear(msgLayer);
    const line = (str, y, size, fill)=> centre(msgLayer, str, y - MSG_TOP, size, fill);
    if (kind === 'title')
    {
        line('COMET', 240, 96, C.white);
        line('hold to swing · release to fly', 330, 22, C.dim);
        line(`HI ${info.hi}`, 540, 22, C.dim);
        line('1P', 600, 18, C.muted);
        if (info.settings) line(info.settings, 656, 14, C.muted);
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
    clear(promptLayer);
    if (str) centre(promptLayer, str, 0, size, C.accent);
}

// how to open the settings from the title, for the device last used; a phone has the pause button
export function settingsWord(padUsed)
{
    if (MOBILE) return '';
    return padUsed ? 'MENU: SETTINGS' : 'ESC: SETTINGS';
}

// the prompt for the device last used
export function pressWord(padUsed)
{
    if (MOBILE) return 'TAP SWING';
    return padUsed ? 'PRESS A' : 'PRESS SPACE';
}

let clock = 0;

// draw a frame. ui: { field, hud, message, info, prompt, hi }
export function render(w, ui, dt)
{
    clock += dt;
    fitLayer(msgLayer); fitLayer(promptLayer);
    const S = surface.scale, g = surface.g;
    g.setTransform(S, 0, 0, S, 0, 0);
    g.globalAlpha = 1;
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    if (ui.field) drawField(g, w);

    // the words, in device pixels, from their own sharp layers
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (ui.hud) drawHud(g, w, ui.hi);
    drawMessage(ui.message, ui.info);
    if (ui.message) g.drawImage(msgLayer.canvas, 0, Math.round(MSG_TOP * S));
    drawPrompt(ui.prompt, ui.message);
    if (ui.prompt && Math.floor(clock * 2) % 2 === 0)
        g.drawImage(promptLayer.canvas, 0, Math.round((PROMPT_AT[ui.message] ?? PROMPT_AT.title)[0] * S));
}
