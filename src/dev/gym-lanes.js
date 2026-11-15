// The gym's lanes: one small world per case, built and stepped with the real rules (world/sim.js), with no drawing,
// so the node tests run the same cases the gym shows. A lane runs its case, records the outcome, and starts again.
//   latch: the comet flies straight down past a ring; it passes if it latched. The pilot is the player's hold.
//   swing: the comet starts latched and lets go after its case's angle; it passes if the release counted.
//   perfect: the comet swings and lets go flying right with a mote ahead; it passes on a perfect.
// The swing row has one more lane, 'you', driven by the player's hold from a standstill.
import { createWorld, step } from '../world/sim.js';
import { CONFIG } from '../world/comet-data.js';
import { gymRows } from './gym-data.js';

const STEP = 1 / 60;
const deg = (rad)=> rad * 180 / Math.PI;

function world(anchors, motes = [])
{
    const w = createWorld(CONFIG, { anchors, motes });
    w.player.trail.length = 0;
    return w;
}
// put the comet somewhere, moving, with no spawn wait and no blinking
function place(w, x, y, vx, vy)
{
    const p = w.player;
    Object.assign(p, { x, y, vx, vy, v: Math.hypot(vx, vy) || CONFIG.vSpawn, latched: false, anchor: -1, invulnUntil: 0 });
    p.trail.length = 0;
    w.life = 'active';
}
// start the comet latched to anchor 0 at radius r and angle theta, turning clockwise on screen
function latch(w, r, theta, v = CONFIG.vSpawn)
{
    const p = w.player, a = w.anchors[0];
    place(w, a.x + r * Math.cos(theta), a.y + r * Math.sin(theta), 0, 0);
    Object.assign(p, { v, latched: true, anchor: 0, r, theta, sign: 1, swept: 0 });
}

/** @param {{ id: string, cases: any[] }} row */
function lanesFor(row)
{
    if (row.id === 'latch')
    {
        // anchors spread evenly; each path sits its case's distance to the left of its ring
        return row.cases.map((c, i)=>
        {
            const ax = 200 + i * 176, ay = 330;
            return { c, setup: (w)=> place(w, ax - c.value, 40, 0, CONFIG.vSpawn), anchors: [[ax, ay]],
                pilot: (lane, hold)=> hold, done: (w)=> w.player.y > 620 || w.t > 6 };
        });
    }
    if (row.id === 'swing')
    {
        /** @type {any[]} */
        const lanes = row.cases.map((c, i)=>
        {
            const ax = 140 + i * 200, ay = 300;
            return { c, setup: (w)=> latch(w, 60, -Math.PI / 2), anchors: [[ax, ay]],
                pilot: (lane)=> deg(lane.w.player.swept) < c.value, done: (w)=> !w.player.latched && far(w, 110) };
        });
        // yours: rests above its ring until you press, then swings while you hold
        lanes.push({ c: { id: 'you', label: 'you', band: '' }, you: true, anchors: [[640, 560]],
            setup: (w)=> latch(w, 60, -Math.PI / 2), pilot: (lane, hold)=> hold, done: (w)=> !w.player.latched && far(w, 110) });
        return lanes;
    }
    // perfect: let go at the top of a small swing, flying right; the mote is the case's distance and angle on
    return row.cases.map((c, i)=>
    {
        const ax = 300, ay = 76 + i * 92, r = 36;
        const a = c.angle * Math.PI / 180, mx = ax + c.value * Math.cos(a), my = ay - r - c.value * Math.sin(a);
        // a whole number of steps of swing, so the release lands exactly at the top, flying right
        const arc = 12 * CONFIG.vSpawn / r * STEP;
        return { c, anchors: [[ax, ay]], motes: [[mx, my]], setup: (w)=> latch(w, r, -Math.PI / 2 - arc),
            pilot: (lane)=> lane.w.player.swept < arc - 1e-6, done: (w)=> !w.player.latched && (w.player.x > ax + 280 || w.t > 4) };
    });
}
const far = (w, d)=> Math.hypot(w.player.x - w.anchors[0].x, w.player.y - w.anchors[0].y) > d;

/** Every gym row with its lanes, ready to step. */
export function buildGym()
{
    return gymRows().map((row)=> ({ ...row, lanes: lanesFor(row).map((l)=> restart({ ...l, w: null, outcome: '', shown: '', runs: 0 })) }));
}

function restart(lane)
{
    lane.w = world(lane.anchors, lane.motes);
    lane.setup(lane.w);
    lane.latched = false; lane.result = ''; lane.waiting = !!lane.you;
    return lane;
}

// what happened to a lane this run, in words, from the sounds the rules queued
function judge(lane, row)
{
    const w = lane.w;
    for (const e of w.sfx)
    {
        if (e.id === 'snap') lane.result = e.pitch === 1 ? 'counted' : e.pitch === .5 ? 'snapped' : 'too short';
        if (e.id === 'chime' && e.pitch > 1.2) lane.result = 'perfect';
    }
    if (w.player.latched) lane.latched = true;
    if (row === 'latch') return lane.latched ? 'latched' : 'missed';
    if (row === 'perfect') return lane.result === 'perfect' ? 'perfect' : lane.result === 'counted' ? 'not perfect' : lane.result;
    return lane.result;
}
const PASS = { latched: true, counted: true, perfect: true };

/**
 * One fixed step of every lane in a row. hold/pressed: the player's button.
 * @returns {{ id: string, pitch: number }[]} the sounds the lanes queued, for the caller to play
 */
export function stepRow(row, hold, pressed)
{
    const sounds = [];
    for (const lane of row.lanes)
    {
        if (lane.waiting) { if (!pressed) continue; lane.waiting = false; }
        const held = lane.pilot(lane, hold);
        step(lane.w, STEP, held, pressed, { x: 0, y: 0 });
        const said = judge(lane, row.id);
        sounds.push(...lane.w.sfx);
        lane.w.sfx.length = 0;
        if (lane.w.life !== 'active' || lane.done(lane.w))
        {
            lane.shown = said || 'missed';
            lane.outcome = PASS[lane.shown] ? 'pass' : 'fail';
            lane.runs++;
            restart(lane);
        }
    }
    return sounds;
}

/** Each case's last outcome against its band: green and orange must pass, red must fail. */
export function verdicts(row)
{
    return row.lanes.filter((l)=> l.c.band && l.runs).map((l)=> ({
        id: l.c.id, band: l.c.band, shown: l.shown,
        ok: (l.c.band === 'red') === (l.outcome === 'fail'),
    }));
}
