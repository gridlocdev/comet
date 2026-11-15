// On-screen controls on a phone or tablet: a stick, one big button to hold (labelled by the game) and a pause button.
// Menus are tapped directly. Nothing shows on a desktop.
import { MOBILE } from '../platform/engine.js';
import { touchState } from '../platform/input.js';

const $ = (id)=> /** @type {HTMLElement} */ (document.getElementById(id));
const root = $('touch'), stick = $('stick'), knob = /** @type {HTMLElement} */ (stick.firstElementChild);
const hold = $('tHold'), pause = $('tPause');
let stickId = null;

function steer(e)
{
    const r = stick.getBoundingClientRect();
    const half = r.width / 2;
    let dx = (e.clientX - r.left - half) / (half * .72), dy = (e.clientY - r.top - half) / (half * .72);
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    touchState.mx = Math.abs(dx) < .05 ? 0 : dx;
    touchState.my = Math.abs(dy) < .05 ? 0 : -dy;
    knob.style.transform = `translate(${dx * half * .6}px,${dy * half * .6}px)`;
}
const release = ()=> { stickId = null; touchState.mx = touchState.my = 0; knob.style.transform = ''; };
stick.addEventListener('pointerdown', (e)=> { e.preventDefault(); stickId = e.pointerId; stick.setPointerCapture(e.pointerId); steer(e); });
stick.addEventListener('pointermove', (e)=> { if (e.pointerId === stickId) steer(e); });
for (const t of /** @type {const} */ (['pointerup', 'pointercancel'])) stick.addEventListener(t, (e)=> { if (e.pointerId === stickId) release(); });

hold.addEventListener('pointerdown', (e)=> { e.preventDefault(); hold.setPointerCapture(e.pointerId); touchState.hold = true; touchState.holdPressed = true; });
for (const t of ['pointerup', 'pointercancel']) hold.addEventListener(t, ()=> { touchState.hold = false; });

const pauses = new Set();
pause.addEventListener('click', ()=> { for (const fn of pauses) fn(); });

export const touch = {
    // each feature that can pause hooks the pause button once, and checks it's the one in charge
    onPause(fn) { pauses.add(fn); },
    // show the controls (with or without the pause button), or hide them all
    show(on, { pausable = true } = {})
    {
        if (!MOBILE) return;
        root.hidden = !on;
        pause.hidden = !pausable;
        release();
        touchState.hold = false;
    },
    // the hold button's word
    holdLabel(text) { hold.textContent = text; },
};
