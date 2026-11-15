// The player's settings: the shared table in lib/settings.js with Comet's changes (docs/settings.md).
// This module owns the live values: it loads them, hands them out and emits 'settings:changed' { id, value } so audio,
// the screen and input apply their own parts. Features read settings; only the settings screen changes them.
import {
    changedSettings, defineSettings, mergeSettings, resetGroup, setSetting, stepSetting, visibleSettings,
} from '../lib/settings.js';
import { setBrightness } from '../platform/engine.js';
import { graphics } from '../platform/graphics.js';
import { input } from '../platform/input.js';
import { events } from './events.js';
import { state } from './state.js';

// Comet's one addition: Music on or off, apart from its volume, so the soundtrack can go and the effects stay
const MUSIC_ON = { id: 'audio.musicOn', group: 'audio', type: 'toggle', label: 'Music', default: true,
    help: 'The soundtrack. Effects keep playing.' };

// what Comet doesn't have: no difficulty presets, one button so nothing to toggle, no rumble, no camera to shake,
// no render scale (Graphics quality sets the pixel ratio), no dialogue, and words in one light system font (no plain-font option needed)
export const SCHEMA = defineSettings({
    remove: [
        'difficulty.preset',
        'controls.stickSensitivity', 'controls.holdActions', 'controls.vibration',
        'display.renderScale',
        'a11y.textScale', 'a11y.subtitles', 'a11y.captions', 'a11y.shake', 'a11y.highContrast', 'a11y.plainFont',
    ],
});
// shown just above Music volume
SCHEMA.splice(SCHEMA.findIndex((s)=> s.id === 'audio.music'), 0, MUSIC_ON);
export const TAGS = ['gamepad'];

const media = (q)=> globalThis.matchMedia?.(q).matches ?? false;
const env = { reducedMotion: media('(prefers-reduced-motion: reduce)'), moreContrast: media('(prefers-contrast: more)') };
let values = {};

// the parts below the game layer, applied here; audio applies its own by listening
function applyLow(id, value)
{
    if (id === 'controls.deadzone') input.setDeadzone(value);
    else if (id === 'display.brightness') setBrightness(value);
    else if (id === 'display.quality') graphics.set(value);
}

export function loadSettings()
{
    values = mergeSettings(SCHEMA, state.slice('core', { settings: {} }).settings, env);
    for (const [id, value] of Object.entries(values)) { applyLow(id, value); events.emit('settings:changed', { id, value }); }
}
/** @param {string} id */
export const setting = (id)=> values[id];
export const allSettings = ()=> values;
/** the settings screen's tabs and rows */
export const settingTabs = ()=> visibleSettings(SCHEMA, TAGS);

function take(next)
{
    const changed = Object.keys(next).filter((id)=> next[id] !== values[id]);
    values = next;
    for (const id of changed) { applyLow(id, values[id]); events.emit('settings:changed', { id, value: values[id] }); }
    return changed.length > 0;
}
// apply at once; the save is written when the screen closes, a slider is let go, or the page is hidden
export const changeSetting = (id, value)=> take(setSetting(SCHEMA, values, id, value));
export const stepSettingBy = (id, steps)=> take(stepSetting(SCHEMA, values, id, steps));
export const resetSettingsGroup = (group)=> take(resetGroup(SCHEMA, values, group, env));

export function saveSettings()
{
    state.slice('core').settings = changedSettings(SCHEMA, values, env);
    state.write();
}
document.addEventListener('visibilitychange', ()=> { if (document.hidden && Object.keys(values).length) saveSettings(); });
