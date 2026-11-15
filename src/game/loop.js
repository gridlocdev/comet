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
    // collect an optional hook from every system, e.g. sections('best') for the best score; nulls are left out
    sections(hook) { return systems.map((s)=> s[hook]?.(ctx)).filter((v)=> v != null); },
};
