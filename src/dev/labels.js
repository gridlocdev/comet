// What every dev room shares: the bar of room controls, the frame each draw starts with, the scale grid, labels and
// signs in field units, and the check views. Labels are in a plain monospace font, apart from the game's pixel font,
// so they read as notes on the game rather than part of it.
import { FLAGS, surface } from '../platform/engine.js';
import { input } from '../platform/input.js';
import { fieldBackdrop, fieldView, setFieldView } from '../render/field.js';
import { SCREEN } from '../world/comet-data.js';

const VIEW_NAMES = ['', 'gray', 'silhouette', 'blackout'];
setFieldView(FLAGS.params.get('view') ?? '');

/** a dev room's URL, keeping ?debug and the view */
export function roomUrl(room, extra = {})
{
    const q = new URLSearchParams({ debug: '', room, ...extra });
    if (fieldView()) q.set('view', fieldView());
    return `?${q}`.replace('debug=&', 'debug&');
}
const setParam = (k, v)=> { const q = new URLSearchParams(location.search); if (v) q.set(k, v); else q.delete(k); history.replaceState(null, '', `?${q}`.replace('debug=&', 'debug&').replace(/debug=$/, 'debug')); };

/**
 * The bar of room controls, top right: back to the hub, previous, the page's name, next, and the view.
 * Keys: Q and E (pad LB and RB) page, V (pad Y) the view, Esc (pad B) the hub. Buttons for mouse and touch.
 * @param {{ pages: { id: string, title: string }[], param: string, onPage: (i: number) => void }} o
 */
export function roomBar({ pages, param, onPage })
{
    const bar = document.createElement('div');
    bar.id = 'room-bar';
    bar.style.cssText = 'position:fixed;z-index:60;top:6px;right:6px;display:flex;gap:4px;align-items:center;font:12px ui-monospace,Menlo,monospace;color:#cde;background:#000c;padding:3px;border:1px solid #234';
    const button = (text, fn)=> { const b = document.createElement('button'); b.textContent = text; b.style.cssText = 'font:inherit;color:inherit;background:#0b1622;border:1px solid #345;padding:4px 8px;min-height:30px;cursor:pointer'; b.onclick = fn; bar.append(b); return b; };
    const name = document.createElement('span');
    let i = Math.max(0, pages.findIndex((p)=> p.id === FLAGS.params.get(param)));
    const go = (k)=> { i = (k + pages.length) % pages.length; name.textContent = ` ${pages[i].title} (${i + 1}/${pages.length}) `; setParam(param, pages[i].id); onPage(i); };
    button('⌂ hub', ()=> { location.search = roomUrl('hub'); });
    button('◀ Q', ()=> go(i - 1));
    bar.append(name);
    button('E ▶', ()=> go(i + 1));
    const view = button('', ()=> cycleView());
    const showView = ()=> { view.textContent = `V view: ${fieldView() || 'normal'}`; };
    function cycleView() { const v = VIEW_NAMES[(VIEW_NAMES.indexOf(fieldView()) + 1) % VIEW_NAMES.length]; setFieldView(v); setParam('view', v); showView(); }
    showView();
    document.body.append(bar);
    go(i);
    return {
        /** call once a step: the room keys */
        update()
        {
            if (input.tabPrev()) go(i - 1);
            if (input.tabNext()) go(i + 1);
            if (input.view()) cycleView();
            if (input.back()) location.search = roomUrl('hub');
        },
        get page() { return i; },
    };
}

/** start a frame: field units, the view's backdrop */
export function frame()
{
    const g = surface.g, S = surface.scale;
    g.setTransform(S, 0, 0, S, 0, 0);
    g.globalAlpha = 1;
    g.fillStyle = fieldBackdrop();
    g.fillRect(0, 0, SCREEN.w, SCREEN.h);
    return g;
}

/** the scale grid: a faint line every 100 px, a brighter one every 500 */
export function grid(g)
{
    g.lineWidth = 1;
    for (let x = 0; x <= SCREEN.w; x += 100) line(g, x, 0, x, SCREEN.h, x % 500 ? '#ffffff10' : '#ffffff24');
    for (let y = 0; y <= SCREEN.h; y += 100) line(g, 0, y, SCREEN.w, y, y % 500 ? '#ffffff10' : '#ffffff24');
}
export function line(g, x0, y0, x1, y1, colour)
{
    g.strokeStyle = colour;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
}

/** a label in field units; align 'left' | 'center' | 'right' */
export function label(g, text, x, y, { colour = '#cde', size = 13, align = 'center' } = {})
{
    g.font = `${size}px ui-monospace, Menlo, monospace`;
    g.textAlign = /** @type {CanvasTextAlign} */ (align);
    g.textBaseline = 'top';
    g.fillStyle = colour;
    g.fillText(text, x, y);
}

/**
 * A sign: a title and wrapped text in a box at (x, y), w wide. Returns its height.
 * @param {string[]} [extra] more lines, such as file paths, in a dimmer colour
 */
export function sign(g, title, text, x, y, w, extra = [])
{
    g.font = '13px ui-monospace, Menlo, monospace';
    const lines = wrap(g, text, w - 20);
    const h = 34 + lines.length * 17 + extra.length * 16 + 8;
    g.fillStyle = '#05080ce8'; g.fillRect(x, y, w, h);
    g.strokeStyle = '#2a4458'; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, w - 1, h - 1);
    label(g, title, x + 10, y + 9, { colour: '#fff', size: 15, align: 'left' });
    lines.forEach((l, i)=> label(g, l, x + 10, y + 32 + i * 17, { align: 'left' }));
    extra.forEach((l, i)=> label(g, l, x + 10, y + 34 + lines.length * 17 + i * 16, { colour: '#7f93a6', size: 12, align: 'left' }));
    return h;
}
function wrap(g, text, w)
{
    const out = [];
    for (const para of text.split('\n'))
    {
        let cur = '';
        for (const word of para.split(' '))
        {
            const next = cur ? `${cur} ${word}` : word;
            if (g.measureText(next).width > w && cur) { out.push(cur); cur = word; }
            else cur = next;
        }
        out.push(cur);
    }
    return out;
}

/** a pointer's position in field units */
export function toField(clientX, clientY)
{
    const r = surface.canvas.getBoundingClientRect();
    return { x: (clientX - r.left) / r.width * SCREEN.w, y: (clientY - r.top) / r.height * SCREEN.h };
}
