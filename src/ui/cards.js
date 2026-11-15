// A full-screen layer of cards and buttons you can move through with keys, a gamepad or a finger.
// open() takes rows of elements with { el, pick?, adjust?(dir) }; update() each step handles navigation.
// An item with adjust is a slider: left and right change it instead of moving the focus, and repeat while held.
import { input } from '../platform/input.js';

const screen = /** @type {HTMLElement} */ (document.getElementById('screen'));
const REPEAT_DELAY = .38, REPEAT_EVERY = .07;   // seconds: holding a direction repeats it

let rows = null, ry = 0, rx = 0, onBack = null, onMove = null, onTick = null;
let held = '', heldFor = 0, repeatAt = 0, lastTime = 0;

function paint()
{
    if (!rows) return;
    // the focus is drawn, not the browser's: a focused button would also click itself on Enter
    rows.forEach((row, y)=> row.forEach((it, x)=> it.el.classList.toggle('focus', y === ry && x === rx)));
    rows[ry]?.[rx]?.el.scrollIntoView?.({ block: 'nearest' });
}

function go(dir)
{
    const row = rows[ry], it = row[rx];
    if ((dir === 'left' || dir === 'right') && it.adjust) { it.adjust(dir === 'left' ? -1 : 1); return; }
    if (dir === 'left' && rx > 0) rx--;
    else if (dir === 'right' && rx < row.length - 1) rx++;
    else if (dir === 'up' && ry > 0) { ry--; rx = Math.min(rx, rows[ry].length - 1); }
    else if (dir === 'down' && ry < rows.length - 1) { ry++; rx = Math.min(rx, rows[ry].length - 1); }
    else return;
    paint();
    onMove?.(rows[ry][rx], 'nav');
}

export const cards = {
    get open() { return !!rows; },
    /** the focused row's index */
    get focusRow() { return ry; },
    root: screen,
    // html is written into the layer first; rows name its elements. focus: [row, col]
    show(html, { dim = true, cls = '' } = {})
    {
        screen.innerHTML = html;
        screen.className = `${dim ? 'dim' : ''} ${cls}`;
        screen.hidden = false;
        rows = null;
    },
    // tick() runs first each step and returns true when it used the step (a screen's own keys, like switching tabs)
    menu(list, { focus = [0, 0], back = null, move = null, tick = null } = {})
    {
        rows = list.map((r)=> r.filter((it)=> it?.el)).filter((r)=> r.length);
        if (!rows.length) { rows = null; return; }
        ry = Math.max(0, Math.min(focus[0], rows.length - 1));
        rx = Math.max(0, Math.min(focus[1], rows[ry].length - 1));
        onBack = back; onMove = move; onTick = tick;
        // a direction already held when the menu opens waits for a fresh press
        held = input.navHeld(); heldFor = 0; repeatAt = Infinity; lastTime = performance.now();
        rows.forEach((row, y)=> row.forEach((it, x)=>
        {
            const take = ()=> { if (rows && (ry !== y || rx !== x)) { ry = y; rx = x; paint(); return true; } return false; };
            it.el.addEventListener('pointerenter', (e)=> { if (e.pointerType === 'mouse' && take()) onMove?.(it, 'pointer'); });
            it.el.addEventListener('pointerdown', ()=> take());
            // a click made by a key (detail 0) is the keyboard's confirm, which update() already handles
            it.el.addEventListener('click', (e)=> { if (!rows || e.detail === 0) return; take(); activate(it); });
        }));
        paint();
    },
    repaint: paint,
    hide() { screen.hidden = true; screen.replaceChildren(); rows = null; },
    update()
    {
        if (!rows) return;
        const t = performance.now(), dt = Math.min(.1, (t - lastTime) / 1000);
        lastTime = t;
        if (onTick?.()) return;
        if (!rows) return;
        const now = input.navHeld();
        const dir = input.nav();
        if (dir) { held = dir; heldFor = 0; repeatAt = REPEAT_DELAY; go(dir); return; }
        if (now && now === held)
        {
            heldFor += dt;
            if (heldFor >= repeatAt) { repeatAt += REPEAT_EVERY; go(now); return; }
        }
        else { held = now; heldFor = 0; repeatAt = now ? Infinity : REPEAT_DELAY; }
        if (input.confirm()) activate(rows[ry][rx]);
        else if (input.back() && onBack) onBack();
    },
};

function activate(it)
{
    if (it.pick) it.pick();
}
