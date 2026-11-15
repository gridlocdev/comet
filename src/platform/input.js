// Raw keys, mouse, gamepad and touch → named actions. Game code asks for an action, never a key or button.
// Gamepad: standard mapping, 0 A, 1 B, 4 LB, 5 RB, 7 right trigger, 9 menu, 12-15 d-pad.
const down = new Set(), pressed = new Set();
addEventListener('keydown', (e)=>
{
    if (e.repeat) return;
    down.add(e.code); pressed.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', (e)=> down.delete(e.code));
addEventListener('blur', ()=> { down.clear(); mouseDown = false; touchState.hold = false; });

// the left mouse button is the hold too, on the game or the black around it (not on a menu card)
let mouseDown = false, mouseClick = false;
const onField = (t)=> t instanceof HTMLCanvasElement || t === document.body || t === document.documentElement;
addEventListener('pointerdown', (e)=> { if (e.pointerType === 'mouse' && e.button === 0 && onField(e.target)) { mouseDown = true; mouseClick = true; } });
addEventListener('pointerup', (e)=> { if (e.pointerType === 'mouse' && e.button === 0) mouseDown = false; });

// ui/touch.js writes here: the stick (mx, my; y up) and the hold button
export const touchState = { mx: 0, my: 0, hold: false, holdPressed: false };

let pad = null, padDown = new Set(), padPressed = new Set(), padNav = '', deadzone = .15;
function readPad()
{
    pad = [...(navigator.getGamepads?.() ?? [])].find((p)=> p?.connected) ?? null;
    const was = padDown;
    padDown = new Set();
    padPressed = new Set();
    if (!pad) return;
    pad.buttons.forEach((b, i)=> { if (b.pressed) { padDown.add(i); if (!was.has(i)) padPressed.add(i); } });
}

const any = (...codes)=> codes.some((c)=> down.has(c));
const anyPressed = (...codes)=> codes.some((c)=> pressed.has(c));

export const input = {
    // x right, y up, length at most 1
    move()
    {
        let x = (any('KeyD', 'ArrowRight') ? 1 : 0) - (any('KeyA', 'ArrowLeft') ? 1 : 0);
        let y = (any('KeyW', 'ArrowUp') ? 1 : 0) - (any('KeyS', 'ArrowDown') ? 1 : 0);
        if (pad)
        {
            const gx = pad.axes[0] ?? 0, gy = -(pad.axes[1] ?? 0);
            if (Math.hypot(gx, gy) > deadzone) { x = gx; y = gy; }
            if (padDown.has(14)) x = -1;
            if (padDown.has(15)) x = 1;
            if (padDown.has(12)) y = 1;
            if (padDown.has(13)) y = -1;
        }
        if (touchState.mx || touchState.my) { x = touchState.mx; y = touchState.my; }
        const len = Math.hypot(x, y);
        return len > 1 ? { x: x / len, y: y / len } : { x, y };
    },
    // the one button, held, and pressed this step
    hold: ()=> any('Space', 'KeyJ', 'ShiftLeft') || padDown.has(0) || padDown.has(7) || touchState.hold || mouseDown,
    holdPressed: ()=> anyPressed('Space', 'KeyJ', 'ShiftLeft') || padPressed.has(0) || padPressed.has(7) || touchState.holdPressed || mouseClick,
    pause: ()=> anyPressed('Escape', 'KeyP') || padPressed.has(9),
    // menus
    confirm: ()=> anyPressed('Space', 'Enter') || padPressed.has(0),
    back: ()=> anyPressed('Escape') || padPressed.has(1),
    // a one-shot direction for moving through cards: 'left' 'right' 'up' 'down' or ''
    nav()
    {
        if (anyPressed('ArrowLeft', 'KeyA')) return 'left';
        if (anyPressed('ArrowRight', 'KeyD')) return 'right';
        if (anyPressed('ArrowUp', 'KeyW')) return 'up';
        if (anyPressed('ArrowDown', 'KeyS')) return 'down';
        if (padPressed.has(14)) return 'left';
        if (padPressed.has(15)) return 'right';
        if (padPressed.has(12)) return 'up';
        if (padPressed.has(13)) return 'down';
        if (pad)
        {
            const gx = pad.axes[0] ?? 0, gy = pad.axes[1] ?? 0;
            const dir = gx < -.6 ? 'left' : gx > .6 ? 'right' : gy < -.6 ? 'up' : gy > .6 ? 'down' : '';
            if (dir !== padNav) { padNav = dir; return dir; }
        }
        return '';
    },
    // the direction held right now, for a menu that repeats while held (a slider): 'left' 'right' 'up' 'down' or ''
    navHeld()
    {
        if (any('ArrowLeft', 'KeyA') || padDown.has(14)) return 'left';
        if (any('ArrowRight', 'KeyD') || padDown.has(15)) return 'right';
        if (any('ArrowUp', 'KeyW') || padDown.has(12)) return 'up';
        if (any('ArrowDown', 'KeyS') || padDown.has(13)) return 'down';
        if (pad)
        {
            const gx = pad.axes[0] ?? 0, gy = pad.axes[1] ?? 0;
            return gx < -.6 ? 'left' : gx > .6 ? 'right' : gy < -.6 ? 'up' : gy > .6 ? 'down' : '';
        }
        return '';
    },
    // the settings screen's tabs: Q and E, or the shoulder buttons (LB 4, RB 5)
    tabPrev: ()=> anyPressed('KeyQ') || padPressed.has(4),
    tabNext: ()=> anyPressed('KeyE') || padPressed.has(5),
    /** the stick's dead zone, from the Controls setting */
    setDeadzone(v) { deadzone = v; },
    // a connected pad decides the prompts
    get hasPad() { return !!pad; },
};

// first in the frame
export function pollInput() { readPad(); }

// last in the frame: presses count for one fixed step
export function clearPresses()
{
    pressed.clear();
    mouseClick = false;
    touchState.holdPressed = false;
}
