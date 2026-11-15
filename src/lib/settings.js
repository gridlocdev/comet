// The standard settings every game shares: the same ids, groups, ranges and defaults, so a player meets the same
// settings screen in each game and the save format never differs. Pure data and functions, no engine or DOM, so tests
// run in node. What each setting does and where the game applies it is in docs/settings.md.
//
// A settings object is flat: { 'audio.music': 0.7, 'a11y.plainFont': false, ... }. Only the values the player changed
// are saved, in state.slice('core').settings, so a setting added later gets its default and a changed default reaches
// players who never touched it.
//
// Entry fields:
//   id        '<group>.<name>', stable forever; rename only through RENAMED
//   group     one of GROUPS, the settings screen's tabs in order
//   type      'range' (number from min to max by step), 'toggle' (boolean) or 'choice' (one of options)
//   label     sentence case, short; help is one line shown under the focused row
//   format    how the screen shows a range value: 'percent' (0.8 -> 80%), 'times' (1.5 -> 1.5×) or 'number'
//   when      a tag the game must have for the setting to show ('3d', 'aim', 'gamepad', 'voice', 'desktop', ...);
//             the game passes its tags to visibleSettings
//   system    a default taken from the player's system: { reducedMotion: value } or { moreContrast: value } replaces
//             default when that media query matches (env passed to mergeSettings)
//   reload    true when the change only takes effect after a reload; the screen says so beside the row

export const GROUPS = ['difficulty', 'audio', 'controls', 'display', 'a11y'];
export const GROUP_LABELS = {
    difficulty: 'Difficulty', audio: 'Audio', controls: 'Controls', display: 'Display', a11y: 'Accessibility',
};

const range = (id, label, min, max, step, def, format, extra = {})=>
    ({ id, group: id.split('.')[0], type: 'range', label, min, max, step, default: def, format, ...extra });
const toggle = (id, label, def, extra = {})=> ({ id, group: id.split('.')[0], type: 'toggle', label, default: def, ...extra });
const choice = (id, label, options, def, extra = {})=>
    ({ id, group: id.split('.')[0], type: 'choice', label, options, default: def, ...extra });

export const SETTINGS = [
    // a game with its own presets replaces options with defineSettings (balance lives in the game, not here)
    choice('difficulty.preset', 'Difficulty', [
        { value: 'relaxed', label: 'Relaxed', help: 'More health, slower enemies, no fail states that cost progress.' },
        { value: 'normal', label: 'Normal', help: 'The game as designed.' },
        { value: 'hard', label: 'Hard', help: 'Tougher enemies and fewer second chances.' },
    ], 'normal'),

    range('audio.master', 'Master volume', 0, 1, 0.05, 0.8, 'percent'),
    range('audio.music', 'Music volume', 0, 1, 0.05, 0.7, 'percent'),
    range('audio.sfx', 'Effects volume', 0, 1, 0.05, 0.8, 'percent'),
    range('audio.voice', 'Voice volume', 0, 1, 0.05, 1, 'percent', { when: 'voice' }),
    toggle('audio.mono', 'Mono audio', false, { help: 'Both ears hear everything.' }),
    toggle('audio.background', 'Play in the background', false, { help: 'Keep sound on when the game is hidden.' }),

    range('controls.lookSensitivity', 'Look sensitivity', 0.5, 1.5, 0.05, 1, 'times', { when: 'aim' }),
    range('controls.stickSensitivity', 'Stick sensitivity', 0.5, 1.5, 0.05, 1, 'times', { when: 'gamepad' }),
    toggle('controls.invertX', 'Invert horizontal look', false, { when: 'aim' }),
    toggle('controls.invertY', 'Invert vertical look', false, { when: 'aim' }),
    range('controls.deadzone', 'Stick dead zone', 0.05, 0.4, 0.05, 0.15, 'percent', { when: 'gamepad' }),
    choice('controls.holdActions', 'Held actions', [
        { value: 'hold', label: 'Hold', help: 'Hold the button to keep running, aiming or crouching.' },
        { value: 'toggle', label: 'Toggle', help: 'Press once to start, again to stop.' },
    ], 'hold'),
    toggle('controls.vibration', 'Vibration', true, { when: 'gamepad' }),

    toggle('display.fullscreen', 'Full screen', false, { when: 'desktop' }),
    choice('display.quality', 'Graphics quality', [
        { value: 'auto', label: 'Automatic', help: 'Lowers detail when the frame rate drops.' },
        { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' },
    ], 'auto'),
    range('display.renderScale', 'Resolution scale', 0.5, 1, 0.05, 1, 'percent',
        { help: 'Lower is faster and softer.' }),
    range('display.fov', 'Field of view', 60, 110, 5, 75, 'number', { when: '3d' }),
    range('display.brightness', 'Brightness', 0.5, 1.5, 0.05, 1, 'percent'),
    toggle('display.showFps', 'Show frame rate', false),

    range('a11y.textScale', 'Text size', 1, 2, 0.25, 1, 'times'),
    toggle('a11y.subtitles', 'Subtitles', true),
    toggle('a11y.captions', 'Sound captions', false, { help: 'Describe important sounds in text.' }),
    range('a11y.shake', 'Screen shake', 0, 1, 0.25, 1, 'percent', { system: { reducedMotion: 0 } }),
    range('a11y.cameraBob', 'Camera motion', 0, 1, 0.25, 1, 'percent', { when: '3d', system: { reducedMotion: 0 } }),
    toggle('a11y.reduceFlashing', 'Reduce flashing', false, { system: { reducedMotion: true } }),
    toggle('a11y.highContrast', 'High contrast', false, { system: { moreContrast: true } }),
    toggle('a11y.plainFont', 'Plain font', false, { help: 'All text in a plain, easy-to-read typeface.' }),
    range('a11y.gameSpeed', 'Game speed', 0.5, 1, 0.1, 1, 'percent', { help: 'Slow everything down.' }),
];

// ids that changed name: old saves are read through this, so renaming never resets a player's choice
export const RENAMED = {};

// a game's own copy of the table: drop settings it can't support, change defaults or options, add its own entries
// (ids still '<group>.<name>' in one of GROUPS). Never edits SETTINGS itself.
export function defineSettings({ remove = [], change = {}, add = [] } = {}, base = SETTINGS)
{
    const out = base.filter((s)=> !remove.includes(s.id)).map((s)=> (change[s.id] ? { ...s, ...change[s.id] } : s));
    for (const s of add)
    {
        if (!GROUPS.includes(s.group)) throw new Error(`setting ${s.id}: unknown group ${s.group}`);
        if (out.some((o)=> o.id === s.id)) throw new Error(`setting ${s.id} already exists`);
        out.push(s);
    }
    return out;
}

// the default for this player: the system's preference (reduced motion, more contrast) where the entry has one
export function defaultOf(entry, env = {})
{
    for (const [flag, value] of Object.entries(entry.system ?? {})) if (env[flag]) return value;
    return entry.default;
}

// a valid value for the entry, or undefined: ranges clamp and snap to the step, choices must be an option
export function clean(entry, value)
{
    if (entry.type === 'toggle') return typeof value === 'boolean' ? value : undefined;
    if (entry.type === 'choice') return entry.options.some((o)=> o.value === value) ? value : undefined;
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    const snapped = entry.min + Math.round((value - entry.min) / entry.step) * entry.step;
    return +Math.min(entry.max, Math.max(entry.min, snapped)).toFixed(6);
}

// the player's saved changes over the defaults; unknown ids and bad values are dropped, renamed ids are followed
export function mergeSettings(schema, saved = {}, env = {})
{
    const renamed = { ...saved };
    for (const [from, to] of Object.entries(RENAMED))
        if (from in renamed) { renamed[to] ??= renamed[from]; delete renamed[from]; }
    const out = {};
    for (const entry of schema) out[entry.id] = clean(entry, renamed[entry.id]) ?? defaultOf(entry, env);
    return out;
}

// only what differs from this player's defaults, for the save slice
export function changedSettings(schema, values, env = {})
{
    const out = {};
    for (const entry of schema) if (values[entry.id] !== defaultOf(entry, env)) out[entry.id] = values[entry.id];
    return out;
}

// a new settings object with one value changed (cleaned); an invalid value leaves it as it was
export function setSetting(schema, values, id, value)
{
    const entry = schema.find((s)=> s.id === id);
    if (!entry) throw new Error(`unknown setting ${id}`);
    const v = clean(entry, value);
    return v === undefined ? values : { ...values, [id]: v };
}

// left/right on a focused row: ranges move by `steps` steps, choices move through options (not wrapping), toggles flip
export function stepSetting(schema, values, id, steps)
{
    const entry = schema.find((s)=> s.id === id);
    const v = values[id];
    if (entry.type === 'toggle') return setSetting(schema, values, id, !v);
    if (entry.type === 'range') return setSetting(schema, values, id, v + steps * entry.step);
    const i = entry.options.findIndex((o)=> o.value === v);
    const j = Math.min(entry.options.length - 1, Math.max(0, i + Math.sign(steps)));
    return setSetting(schema, values, id, entry.options[j].value);
}

// Reset to defaults for one group (the button at the bottom of each tab)
export function resetGroup(schema, values, group, env = {})
{
    const out = { ...values };
    for (const entry of schema) if (entry.group === group) out[entry.id] = defaultOf(entry, env);
    return out;
}

// the rows to show, grouped in screen order: only settings whose `when` tag the game has; empty groups left out
export function visibleSettings(schema, tags = [])
{
    const out = [];
    for (const group of GROUPS)
    {
        const rows = schema.filter((s)=> s.group === group && (!s.when || tags.includes(s.when)));
        if (rows.length) out.push({ group, label: GROUP_LABELS[group], rows });
    }
    return out;
}

// the value as the screen shows it
export function formatSetting(entry, value)
{
    if (entry.type === 'toggle') return value ? 'On' : 'Off';
    if (entry.type === 'choice') return entry.options.find((o)=> o.value === value)?.label ?? String(value);
    if (entry.format === 'percent') return `${Math.round(value * 100)}%`;
    if (entry.format === 'times') return `${+value.toFixed(2)}×`;
    return String(value);
}
