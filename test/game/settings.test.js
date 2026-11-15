// The settings as Comet keeps them: loaded over the save, and 1.0.0's one Sound switch carried over.
import '../dom.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storage } from '../../src/platform/storage.js';
import { state } from '../../src/game/state.js';
import { SCHEMA, changeSetting, loadSettings, saveSettings, setting, settingTabs } from '../../src/game/settings.js';

const KEY = 'comet-save-v1';
const saved = { [KEY]: JSON.stringify({ core: { sound: 0 } }) };
storage.backend = { async load() { return { ...saved }; }, write(all) { Object.assign(saved, all); } };

test('1.0.0 with Sound off starts with Master volume at 0, and the old switch is gone', async ()=>
{
    await storage.init();
    state.load();
    loadSettings();
    assert.equal(setting('audio.master'), 0);
    assert.equal(setting('audio.sfx'), .8);
    saveSettings();
    assert.deepEqual(JSON.parse(saved[KEY]).core, { settings: { 'audio.master': 0 } });
});

test('only changed settings are saved', ()=>
{
    changeSetting('audio.master', .8);
    changeSetting('a11y.reduceFlashing', true);
    saveSettings();
    assert.deepEqual(JSON.parse(saved[KEY]).core.settings, { 'a11y.reduceFlashing': true });
});

test('the screen shows what Comet can apply: Music on/off, no difficulty, no shake, no text options', ()=>
{
    assert.deepEqual(settingTabs().map((t)=> t.group), ['audio', 'controls', 'display', 'a11y']);
    const ids = settingTabs().flatMap((t)=> t.rows.map((r)=> r.id));
    assert.deepEqual(ids, [
        'audio.master', 'audio.musicOn', 'audio.music', 'audio.sfx', 'audio.mono', 'audio.background',
        'controls.deadzone',
        'display.brightness', 'display.showFps',
        'a11y.reduceFlashing', 'a11y.gameSpeed',
    ]);
    assert.ok(!SCHEMA.some((s)=> s.id === 'a11y.shake'));
});

test('Music off is its own setting, saved apart from the volume', ()=>
{
    loadSettings();
    assert.equal(setting('audio.musicOn'), true);
    changeSetting('audio.musicOn', false);
    assert.equal(setting('audio.musicOn'), false);
    assert.equal(setting('audio.music'), .7);
    changeSetting('audio.musicOn', true);
});
