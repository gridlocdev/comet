// Boot only. New features register in features/index.js, never here.
import { FLAGS, clock, startLoop } from './platform/engine.js';
import { clearPresses, pollInput } from './platform/input.js';
import { storage } from './platform/storage.js';
import { state } from './game/state.js';
import { loadSettings } from './game/settings.js';
import { events } from './game/events.js';
import { loop } from './game/loop.js';
import { features } from './features/index.js';
import { fpsSystem } from './ui/fps.js';
import { musicSystem } from './audio/music.js';

await storage.init();
state.load();
loadSettings();

// ?debug loads the dev tools; ?debug&room= opens a dev room in place of the game
const dev = FLAGS.debug ? await import('./dev/index.js') : null;
const room = dev?.openRoom();
const systems = room ? [room] : features;
loop.use([musicSystem, fpsSystem, ...systems]);
loop.build();
dev?.installDebug({ state, events, loop, clock, features: systems });

startLoop(
    (dt)=> { pollInput(); loop.update(dt); clearPresses(); },
    (dt)=> loop.draw(dt),
);
