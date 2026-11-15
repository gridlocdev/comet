// Graphics quality: the presets, and a watchdog that steps down through them while frames run slow.
// Comet draws thin lines and flat colours with no effects to thin out, so its one cost is how many pixels it fills: a
// preset caps the pixel ratio. High is the game as designed (up to 2 backing pixels per CSS pixel); Automatic starts
// there on every device, steps down through Medium and Low on one that can't keep up, and then below 1.
// Imports nothing: engine.js asks it for the pixel ratio and refits the canvas when it changes.
export const PRESETS = {
    high: { dpr: 2 },
    medium: { dpr: 1.5 },
    low: { dpr: 1 },
};
// Automatic's steps: the presets, then Low with the pixel ratio lowered further
const LADDER = [
    { name: 'high', dpr: 2 }, { name: 'medium', dpr: 1.5 }, { name: 'low', dpr: 1 },
    { name: 'low .85', dpr: .85 }, { name: 'low .7', dpr: .7 },
];

const TARGET = 40;          // frames per second; under this for SLOW seconds is a step down
const SLOW = 3;             // seconds under the target before a step
const GAP = 10;             // seconds at least between two steps
const SMOOTH = .5;          // seconds; the average frame rate's time constant

let choice = 'auto', step = 0, fps = 60, slowFor = 0, sinceStep = GAP;
const listeners = [];
const changed = ()=> { for (const fn of listeners) fn(); };

export const graphics = {
    /** the most backing pixels per CSS pixel */
    get dpr() { return choice === 'auto' ? LADDER[step].dpr : PRESETS[choice].dpr; },
    /** its name, for the debug readout */
    get name() { return choice === 'auto' ? `auto ${LADDER[step].name}` : choice; },
    /**
     * the Graphics quality setting; choosing again, even Automatic, starts Automatic back at high
     * @param {string} value auto, low, medium or high
     */
    set(value)
    {
        const before = this.dpr;
        choice = PRESETS[value] ? value : 'auto'; step = 0; slowFor = 0; sinceStep = GAP;
        if (this.dpr !== before) changed();
    },
    /** @param {() => void} fn called when the pixel ratio changes */
    onChange(fn) { listeners.push(fn); },
};

/**
 * Called by the engine once per drawn frame with its real length. In Automatic, a frame rate under the target for a
 * few seconds steps down one rung, at most one step every GAP seconds; it never steps back up on its own.
 * @param {number} dt seconds
 */
export function watchFrames(dt)
{
    if (dt <= 0) return;
    fps += (1 / dt - fps) * Math.min(1, dt / SMOOTH);
    sinceStep += dt;
    if (choice !== 'auto' || step >= LADDER.length - 1) return;
    slowFor = fps < TARGET ? slowFor + dt : 0;
    if (slowFor >= SLOW && sinceStep >= GAP) { step++; slowFor = 0; sinceStep = 0; changed(); }
}
