// The one file that sets up the drawing surface, the URL flags and the fixed-step loop.
// The surface is a 2D canvas showing a fixed logical field (the game picks its size with fitSurface), as large as the
// window allows at that aspect, centred on black. Its backing store follows the device pixel ratio, so lines and the
// pixel font stay sharp on a high-DPI screen, up to the quality preset's cap.

import { graphics, watchFrames } from './graphics.js';

// a phone or tablet: a touch screen whose main pointer is a finger
export const MOBILE = matchMedia('(pointer: coarse)').matches;

// URL flags, read once here; other files import FLAGS and never read the URL
const params = new URLSearchParams(location.search);
export const FLAGS = { debug: params.has('debug'), mute: params.has('mute'), params };

// past 2 device pixels per CSS pixel the picture looks no sharper, and a 3x phone would fill four times the pixels;
// the Graphics quality preset (platform/graphics.js) sets the cap, 2 at High

const canvas = document.createElement('canvas');
canvas.id = 'game';
document.body.prepend(canvas);
const g = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d', { alpha: false }));

// w × h: the logical field; scale: backing pixels per logical pixel; version: bumped on every resize
export const surface = { canvas, g, w: 1280, h: 720, scale: 1, version: 0 };

function fit()
{
    const { w, h } = surface;
    const k = Math.min(innerWidth / w, innerHeight / h);
    const cssW = Math.max(1, Math.floor(w * k)), cssH = Math.max(1, Math.floor(h * k));
    Object.assign(canvas.style, {
        width: `${cssW}px`, height: `${cssH}px`,
        left: `${Math.floor((innerWidth - cssW) / 2)}px`, top: `${Math.floor((innerHeight - cssH) / 2)}px`,
    });
    const dpr = Math.min(devicePixelRatio || 1, graphics.dpr);     // the quality preset's cap
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    surface.scale = canvas.width / w;
    surface.version++;
}

// the game's logical size; the canvas is letterboxed to this aspect
export function fitSurface(w, h)
{
    surface.w = w; surface.h = h;
    fit();
}
fit();
addEventListener('resize', fit);
graphics.onChange(fit);
// a window dragged to a screen with another pixel ratio fires no resize
const watchDpr = ()=> matchMedia(`(resolution: ${devicePixelRatio}dppx)`).addEventListener('change', ()=> { fit(); watchDpr(); }, { once: true });
watchDpr();

// the Brightness setting: a filter on the one canvas (1 leaves it alone)
export function setBrightness(v) { canvas.style.filter = v === 1 ? '' : `brightness(${v})`; }

// the whole game's clock: slowing it (?debug slow motion) slows the same fixed-step simulation
export const clock = { speed: 1, paused: false, now: 0 };

const STEP = 1 / 60;
// update(dt) runs at a fixed 60 Hz; draw(dt) once per display frame, with real time
export function startLoop(update, draw)
{
    let last = performance.now(), bank = 0;
    const frame = (now)=>
    {
        requestAnimationFrame(frame);
        const dt = Math.min(.1, (now - last) / 1000);
        last = now;
        clock.now += dt;
        if (!clock.paused) bank += dt * clock.speed;
        for (let n = 0; bank >= STEP && n < 12; n++) { bank -= STEP; update(STEP); }
        if (bank > STEP * 4) bank = 0;
        draw(dt);
        watchFrames(dt);
    };
    requestAnimationFrame(frame);
}
