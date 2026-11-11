// A full-screen layer of cards and buttons you can move through with keys, a gamepad or a finger.
// open() takes rows of elements with { el, pick, enabled? }; update() each step handles navigation.
import { input } from '../platform/input.js';

const screen = /** @type {HTMLElement} */ (document.getElementById('screen'));

let rows = null, ry = 0, rx = 0, onBack = null, onMove = null;

function paint()
{
    if (!rows) return;
    rows.forEach((row, y)=> row.forEach((it, x)=> it.el.classList.toggle('focus', y === ry && x === rx)));
}

export const cards = {
    get open() { return !!rows; },
    root: screen,
    // html is written into the layer first; rows name its elements. focus: [row, col]
    show(html, { dim = true, cls = '' } = {})
    {
        screen.innerHTML = html;
        screen.className = `${dim ? 'dim' : ''} ${cls}`;
        screen.hidden = false;
        rows = null;
    },
    menu(list, { focus = [0, 0], back = null, move = null } = {})
    {
        rows = list.filter((r)=> r.length);
        [ry, rx] = focus;
        onBack = back; onMove = move;
        rows.forEach((row, y)=> row.forEach((it, x)=>
        {
            it.el.addEventListener('pointerenter', ()=> { if (ry !== y || rx !== x) { ry = y; rx = x; paint(); onMove?.(it); } });
            it.el.addEventListener('click', ()=> { ry = y; rx = x; paint(); activate(it); });
        }));
        paint();
    },
    repaint: paint,
    hide() { screen.hidden = true; screen.replaceChildren(); rows = null; },
    update()
    {
        if (!rows) return;
        const dir = input.nav();
        if (dir)
        {
            const row = rows[ry];
            if (dir === 'left' && rx > 0) rx--;
            else if (dir === 'right' && rx < row.length - 1) rx++;
            else if (dir === 'up' && ry > 0) { ry--; rx = Math.min(rx, rows[ry].length - 1); }
            else if (dir === 'down' && ry < rows.length - 1) { ry++; rx = Math.min(rx, rows[ry].length - 1); }
            else return;
            paint();
            onMove?.(rows[ry][rx]);
            return;
        }
        if (input.confirm()) activate(rows[ry][rx]);
        else if (input.back() && onBack) onBack();
    },
};

function activate(it)
{
    if (it.pick) it.pick();
}
