// The Show frame rate setting: a small readout in the top left corner, frames per second over the last half second.
// Not the debug readout; it shows in any build when the player turns it on.
import { events } from '../game/events.js';
import { setting } from '../game/settings.js';

const el = document.createElement('div');
el.id = 'fps';
el.hidden = true;
document.body.append(el);

let frames = 0, time = 0;
events.on('settings:changed', ({ id, value })=> { if (id === 'display.showFps') { el.hidden = !value; frames = time = 0; } });

export const fpsSystem = {
    build() { el.hidden = !setting('display.showFps'); },
    draw(dt)
    {
        if (el.hidden) return;
        frames++; time += dt;
        if (time >= .5) { el.textContent = `${Math.round(frames / time)} FPS`; frames = time = 0; }
    },
};
