// Words in the pixel font on a canvas of their own at the surface's real resolution, so every font pixel lands on
// whole device pixels. A layer covers the field's width and h of its rows, and is redrawn only when its key changes:
//   const l = wordLayer(112);  if (fitLayer(l) || key !== l.key) { l.key = key; clear(l); text(l, 'HI', 24, 18, 32, '#fff'); }
//   g.drawImage(l.canvas, 0, Math.round(top * surface.scale));
import { surface } from '../platform/engine.js';
import { pixelCentre, pixelText, pixelWidth } from './pixel-text.js';

export function wordLayer(h)
{
    const canvas = document.createElement('canvas');
    return { canvas, g: /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d')), h, key: '', version: -1 };
}

// on a resize, match the new resolution and forget what was drawn
export function fitLayer(l)
{
    if (l.version === surface.version) return false;
    l.version = surface.version;
    l.canvas.width = surface.canvas.width;
    l.canvas.height = Math.ceil(l.h * surface.scale);
    l.key = '';
    return true;
}

export const clear = (l)=> l.g.clearRect(0, 0, l.canvas.width, l.canvas.height);

// lines of words in field units, scaled to the layer's pixels
const S = ()=> surface.scale;
export const text = (l, str, x, y, size, fill)=> pixelText(l.g, str, x * S(), y * S(), size * S(), fill);
export const centre = (l, str, y, size, fill)=> pixelCentre(l.g, str, surface.w / 2 * S(), y * S(), size * S(), fill);
export const rightAt = (l, str, x, y, size, fill)=> pixelText(l.g, str, x * S() - pixelWidth(str, size * S()), y * S(), size * S(), fill);
export function dot(l, x, y, r, fill)
{
    const g = l.g;
    g.fillStyle = fill;
    g.beginPath(); g.arc(x * S(), y * S(), r * S(), 0, Math.PI * 2); g.fill();
}
