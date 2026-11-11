// ?debug only, never loaded by the shipped game: the live readout, the console hook and the debug keys.
import { FLAGS } from '../platform/engine.js';

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
        const now = features.map((f)=> f.debug?.()).find(Boolean) ?? {};
        panel.textContent = JSON.stringify(now).replace(/[{}"]/g, '').replace(/,/g, '  ');
    }, 100);
}
