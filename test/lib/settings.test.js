import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    SETTINGS, GROUPS, defineSettings, mergeSettings, changedSettings, setSetting, stepSetting, resetGroup,
    visibleSettings, formatSetting, clean,
} from '../../src/lib/settings.js';

const byId = (id)=> SETTINGS.find((s)=> s.id === id);

test('every entry is well formed: unique ids in a known group, defaults valid', ()=>
{
    const ids = new Set();
    for (const s of SETTINGS)
    {
        assert.ok(!ids.has(s.id), `duplicate ${s.id}`);
        ids.add(s.id);
        assert.ok(GROUPS.includes(s.group), s.id);
        assert.equal(s.id.split('.')[0], s.group, s.id);
        assert.equal(clean(s, s.default), s.default, `${s.id} default is not a valid value`);
        for (const v of Object.values(s.system ?? {})) assert.equal(clean(s, v), v, `${s.id} system default`);
    }
});

test('saved changes override the defaults; bad and unknown values are dropped', ()=>
{
    const v = mergeSettings(SETTINGS, { 'audio.music': 0.3, 'audio.sfx': 'loud', 'old.thing': 1 });
    assert.equal(v['audio.music'], 0.3);
    assert.equal(v['audio.sfx'], byId('audio.sfx').default);
    assert.ok(!('old.thing' in v));
    assert.deepEqual(changedSettings(SETTINGS, v), { 'audio.music': 0.3 });
});

test('ranges clamp and snap to the step', ()=>
{
    let v = mergeSettings(SETTINGS);
    v = setSetting(SETTINGS, v, 'a11y.textScale', 9);
    assert.equal(v['a11y.textScale'], 2);
    v = setSetting(SETTINGS, v, 'a11y.textScale', 1.3);
    assert.equal(v['a11y.textScale'], 1.25);
    v = setSetting(SETTINGS, v, 'audio.master', 0.1 + 0.2);
    assert.equal(v['audio.master'], 0.3, 'no float noise');
});

test('stepping moves ranges by a step, choices without wrapping, and flips toggles', ()=>
{
    let v = mergeSettings(SETTINGS);
    v = stepSetting(SETTINGS, v, 'audio.music', -2);
    assert.equal(v['audio.music'], 0.6);
    v = stepSetting(SETTINGS, v, 'display.quality', -1);
    assert.equal(v['display.quality'], 'auto', 'already first');
    v = stepSetting(SETTINGS, v, 'display.quality', 1);
    assert.equal(v['display.quality'], 'low');
    v = stepSetting(SETTINGS, v, 'a11y.plainFont', 1);
    assert.equal(v['a11y.plainFont'], true);
});

test('the system reduced-motion preference sets the default, and is not saved as a change', ()=>
{
    const env = { reducedMotion: true };
    const v = mergeSettings(SETTINGS, {}, env);
    assert.equal(v['a11y.shake'], 0);
    assert.equal(v['a11y.reduceFlashing'], true);
    assert.deepEqual(changedSettings(SETTINGS, v, env), {});
    assert.equal(mergeSettings(SETTINGS, { 'a11y.shake': 0.5 }, env)['a11y.shake'], 0.5, 'the player wins');
});

test('reset touches only its group', ()=>
{
    let v = mergeSettings(SETTINGS, { 'audio.music': 0.2, 'a11y.plainFont': true });
    v = resetGroup(SETTINGS, v, 'audio');
    assert.equal(v['audio.music'], byId('audio.music').default);
    assert.equal(v['a11y.plainFont'], true);
});

test('visible settings follow the game tags, in group order', ()=>
{
    const twoD = visibleSettings(SETTINGS, []);
    const ids = twoD.flatMap((g)=> g.rows.map((r)=> r.id));
    assert.ok(!ids.includes('display.fov'));
    assert.ok(!ids.includes('controls.vibration'));
    assert.deepEqual(twoD.map((g)=> g.group), GROUPS);
    const threeD = visibleSettings(SETTINGS, ['3d', 'aim', 'gamepad']).flatMap((g)=> g.rows.map((r)=> r.id));
    assert.ok(threeD.includes('display.fov') && threeD.includes('controls.invertY'));
});

test('a game can drop, change and add settings without touching the shared table', ()=>
{
    const mine = defineSettings({
        remove: ['display.brightness'],
        change: { 'audio.music': { default: 0.5 } },
        add: [{ id: 'display.scanlines', group: 'display', type: 'toggle', label: 'Scanlines', default: true }],
    });
    assert.ok(!mine.some((s)=> s.id === 'display.brightness'));
    assert.equal(mergeSettings(mine)['audio.music'], 0.5);
    assert.equal(mergeSettings(mine)['display.scanlines'], true);
    assert.equal(byId('audio.music').default, 0.7, 'shared table unchanged');
    assert.throws(()=> defineSettings({ add: [{ id: 'x.y', group: 'x', type: 'toggle', default: false }] }));
});

test('values read the way the screen shows them', ()=>
{
    assert.equal(formatSetting(byId('audio.master'), 0.8), '80%');
    assert.equal(formatSetting(byId('a11y.textScale'), 1.5), '1.5×');
    assert.equal(formatSetting(byId('display.fov'), 90), '90');
    assert.equal(formatSetting(byId('a11y.subtitles'), false), 'Off');
    assert.equal(formatSetting(byId('display.quality'), 'auto'), 'Automatic');
});
