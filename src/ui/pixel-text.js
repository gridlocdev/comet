// Drawing lib/pixel-font.js on a 2D canvas: every font pixel is a filled rectangle snapped to whole canvas pixels,
// so the words stay blocky and sharp at any size. Size is the line's height in canvas pixels (10 = one per font pixel).
import { CELL, measure, pixels } from '../lib/pixel-font.js';

// a line with its top-left corner at (x, y)
export function pixelText(g, str, x, y, size, fill)
{
    const s = size / CELL;
    g.fillStyle = fill;
    for (const [px, py] of pixels(str))
    {
        const x0 = Math.round(x + px * s), y0 = Math.round(y + py * s);
        g.fillRect(x0, y0, Math.round(x + (px + 1) * s) - x0, Math.round(y + (py + 1) * s) - y0);
    }
}
export const pixelWidth = (str, size)=> Math.round(measure(str) * size / CELL);
// a line centred on x
export const pixelCentre = (g, str, x, y, size, fill)=> pixelText(g, str, Math.round(x - pixelWidth(str, size) / 2), y, size, fill);
