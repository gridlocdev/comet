// The player's comfort settings, shared by every feature that makes noise.
import { state } from '../game/state.js';
const DEFAULTS = { sound: 1 };
export const settings = {
    get data() { return state.slice('core', DEFAULTS); },
    get(key) { return this.data[key]; },
    toggle(key) { const d = this.data; d[key] = d[key] ? 0 : 1; state.write(); return d[key]; },
};
