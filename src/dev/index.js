// ?debug only, never loaded by the shipped game: the live readout, the console hook, the debug keys, and the dev
// rooms (?debug&room=hub|gym|zoo|museum), which stand in for the game's features while one is open.
import { FLAGS } from '../platform/engine.js';
import { graphics } from '../platform/graphics.js';
import { hubRoom } from './hub.js';
import { gymRoom } from './gym.js';
import { zooRoom } from './zoo.js';
import { museumRoom } from './museum.js';

const ROOMS = { hub: hubRoom, gym: gymRoom, zoo: zooRoom, museum: museumRoom };

/** the room ?room= names, as a system for the loop, or null for the game */
export function openRoom()
{
    const name = FLAGS.params.get('room');
    if (!name) return null;
    return (ROOMS[name] ?? ROOMS.hub)();
}

export function installDebug({ state, events, loop, clock, features })
{
    Object.assign(window, { game: { state, events, loop, clock, features } });
    if (FLAGS.params.has('speed')) clock.speed = Number(FLAGS.params.get('speed')) || 1;
    addEventListener('keydown', (e)=>
    {
        if (e.code === 'Digit1') clock.speed = clock.speed === 1 ? .25 : 1;     // slow motion
        if (e.code === 'Digit2') clock.speed = clock.speed === 1 ? 4 : 1;       // fast forward
    });
    const panel = /** @type {HTMLElement} */ (document.getElementById('debug'));
    panel.hidden = false;
    setInterval(()=>
    {
        const now = { ...features.map((f)=> f.debug?.()).find(Boolean), gfx: graphics.name };
        panel.textContent = JSON.stringify(now).replace(/[{}"]/g, '').replace(/,/g, '  ');
    }, 100);
}
