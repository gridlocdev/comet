// Boot only. New features register in features/index.js, never here.
import { FLAGS, clock, startLoop } from './platform/engine.js';
import { clearPresses, pollInput } from './platform/input.js';
import { loadFonts } from './platform/fonts.js';
import { storage } from './platform/storage.js';
import { state } from './game/state.js';
import { loadSettings } from './game/settings.js';
import { events } from './game/events.js';
import { loop } from './game/loop.js';
import { features } from './features/index.js';
import { fpsSystem } from './ui/fps.js';
import { musicSystem } from './audio/music.js';

// the menu cards' fonts; the game's own words are in the pixel font
await loadFonts([
    { family: 'Bangers', url: 'assets/fonts/bangers.woff2' },
    { family: 'Chakra Petch', url: 'assets/fonts/chakra-petch-700.woff2', weight: '700' },
    { family: 'Monoton', url: 'assets/fonts/monoton.woff2' },
]);
await storage.init();
state.load();
loadSettings();

loop.use([musicSystem, fpsSystem, ...features]);
loop.build();

if (FLAGS.debug)
{
    const { installDebug } = await import('./dev/index.js');
    installDebug({ state, events, loop, clock, features });
}

startLoop(
    (dt)=> { pollInput(); loop.update(dt); clearPresses(); },
    (dt)=> loop.draw(dt),
);
