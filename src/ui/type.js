// The game's words on a 2D canvas, in the same type as the menus (style.css): the system sans in a light weight, big
// lines thinner and spaced wide. Size is the line's height in canvas pixels; (x, y) is the line's top. unit is canvas
// pixels per field unit, so a line looks the same on every screen.
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

function set(g, size, fill, align, unit)
{
    const f = size / unit;
    g.font = `${f >= 40 ? 200 : f >= 22 ? 300 : 400} ${size}px ${FONT}`;
    g.letterSpacing = `${(f >= 40 ? .3 : .08) * size}px`;
    g.fillStyle = fill; g.textAlign = align; g.textBaseline = 'top';
    return parseFloat(g.letterSpacing) || 0;
}
// a line from its left end at x
export function textAt(g, str, x, y, size, fill, unit = 1) { set(g, size, fill, 'left', unit); g.fillText(str, x, y); }
// a line ending at x; the spacing after the last letter is left out
export function textRight(g, str, x, y, size, fill, unit = 1) { const s = set(g, size, fill, 'right', unit); g.fillText(str, x + s, y); }
// a line centred on x
export function textCentre(g, str, x, y, size, fill, unit = 1) { const s = set(g, size, fill, 'center', unit); g.fillText(str, x + s / 2, y); }
