// Runs registered systems and features in order. main.js wires this into the engine's fixed step and draw.
import { state } from './state.js';
import { events } from './events.js';

const systems = [];
const ctx = { state, events };

export const loop = {
    use(list) { systems.push(...list); },
    build() { for (const s of systems) s.build?.(ctx); },
    update(dt) { for (const s of systems) s.update?.(dt, ctx); },
    // once per display frame, with real time
    draw(dt) { for (const s of systems) s.draw?.(dt, ctx); },
};
