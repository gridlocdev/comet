# Settings

Comet uses the standard settings table in `src/lib/settings.js`: the same ids, groups, ranges, defaults, save format and screen as the other games. Its own changes are made in `src/game/settings.js` with `defineSettings`, never by editing the table.

## Comet's changes

Removed, because Comet can't apply them:

- `difficulty.preset`: one set of numbers. With no rows, Difficulty has no tab.
- `controls.stickSensitivity`: the stick only picks which anchor to prefer; there is no look or cursor.
- `controls.holdActions`: the game is one held button; a toggle would change the game, not its comfort.
- `controls.vibration`: no rumble.
- `display.renderScale`: Graphics quality already sets the pixel ratio, Comet's one cost.
- `a11y.shake`: nothing in Comet shakes. A crash flashes the screen's edge instead (see Reduce flashing).
- `a11y.textScale`, `a11y.plainFont`, `a11y.highContrast`: the game's words are one light system font at fixed sizes in a fixed palette.
- `a11y.subtitles`, `a11y.captions`: no dialogue, and every sound has something to see with it.

Tags: `gamepad`. Nothing changed or added. Full screen is a button row in Display (a browser only allows it from a press).

## The table

Ranges are `min–max, step`.

| Id | Type | Range or options | Default | Applied in |
| --- | --- | --- | --- | --- |
| `audio.master` | range | 0–1, 0.05 | 0.8 | master gain, `audio/sfx.js` (squared, so the slider sounds even) |
| `audio.musicOn` | toggle | on/off | on | Comet's own: the soundtrack on or off, apart from its volume; `audio/music.js` |
| `audio.music` | range | 0–1, 0.05 | 0.7 | music bus, `audio/music.js` |
| `audio.sfx` | range | 0–1, 0.05 | 0.8 | effects bus, `audio/sfx.js` |
| `audio.mono` | toggle | | off | master folded to one channel |
| `audio.background` | toggle | | off | a hidden tab keeps its sound |
| `controls.deadzone` | range | 0.05–0.4, 0.05 | 0.15 | the stick read in `platform/input.js` |
| `display.quality` | choice | auto, low, medium, high | auto | the pixel-ratio cap in `platform/graphics.js`: High 2 (the game as designed), Medium 1.5, Low 1. Automatic starts at High and steps down while frames run under 40 fps, past Low to 0.85 and 0.7 |
| `display.brightness` | range | 0.5–1.5, 0.05 | 1 | a `brightness()` filter on the canvas, `platform/engine.js` |
| `display.showFps` | toggle | | off | a corner readout, `ui/fps.js` |
| `a11y.reduceFlashing` | toggle | | off (on with reduced motion) | `render/field.js`: the comet's blink while it can't be hurt becomes a steady half-bright comet, the tether stops blinking before it snaps, and the crash flash at the edge is half as bright |
| `a11y.gameSpeed` | range | 0.5–1, 0.1 | 1 | scales the run's time step in `features/run`; menus and sounds keep their pace |

At the default volumes the effects bus plays at 1.0.0's level: the bus and the output make up for the 80% sliders. (The release, crash, swing hum and blips themselves are softer than 1.0.0's, see sound.md.)

## Save and loading

- Settings are a flat object of id to value. Only values that differ from the defaults are saved, in `core.settings`, so a setting added later gets its default and a better default reaches players who never touched it.
- Reduced motion and more contrast are read from the system on load; a choice the player made wins.
- Never rename an id in place: add the old id to `RENAMED` in `lib/settings.js`.
- `game/settings.js` owns the live values: `loadSettings()` at boot, `setting(id)` to read, and `settings:changed` { id, value } so audio, input and the screen apply their parts. Changes apply at once; the save is written when the screen closes, a bar is let go, or the page is hidden.
- Old saves: 1.0.0's one Sound switch (`core.sound`) is removed by `game/state.js`; Sound off becomes Master volume 0.

## The settings screen

- Tabs in order: Audio, Controls, Display, Accessibility. Q and E, or LB and RB, switch tabs, as does moving along the tab row; a mouse click on a tab too.
- One row per setting: label left, value right (80%, On). Up and down move; left and right change the value one step, repeating while held; confirm flips a toggle. A range has a bar the mouse can drag and a finger slide.
- The help line under the list explains the focused row.
- Reset to defaults ends each tab and resets only that tab, after a second press.
- Back saves and returns to what opened it. No Apply button.
- It opens from the pause menu, and from the title with Esc, the pad's menu button or the touch pause button. The title says how (`ESC: SETTINGS` or `MENU: SETTINGS`; nothing on a phone, where the pause button shows).

## The pause menu

Continue (focused), Settings, Restart, Quit to title. Restart and Quit lose the run, so each asks first with No focused.
