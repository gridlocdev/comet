# Architecture

Comet is plain ES modules drawn on a 2D canvas, with no bundler and no runtime dependencies. The rules of a run live in a headless simulation in `world/`; the features (the run and its screens, the top ten) drive it, and what you see and hear reacts to what it announces.

## Layout

```
src/
  lib/        pure helpers: pixel-font (the bitmap font), high-scores (the top-ten table), synth (sound synthesis)
  platform/   engine.js (the canvas, letterboxing, URL flags, MOBILE, the fixed-step loop), input, storage, fonts
  game/       events (pub/sub), state (the save and its slices), loop (the feature list and its hooks)
  world/      the rules of a run, headless: comet-data.js (numbers and the arena), sim.js (the fixed step)
  render/     palette, field (the play field drawn from a world)
  ui/         cards (menus you move through with keys, a pad or a finger), initials (the three-letter entry), kinetic
              (banner lettering), hud, word-layer (pixel-font words on their own canvas), settings, touch controls,
              pixel-text (lib/pixel-font.js on a 2D canvas), style.css
  audio/      sfx.js (Web Audio: baked UI sounds, loaded samples and loops), sfx-defs.js (the UI sounds as code)
  features/
    run/      a run and the screens around it: index.js (title, play, pause, game over, sound), view.js (the frame)
    scores/   the top ten and the initials entry, and their save slice
  dev/        ?debug tools, loaded only with that flag
  main.js     boot
```

## Rules

- Imports only point down `lib → platform → game → (world, player, render, ui, audio) → features → main.js`. `dev/` sits on top and may read any layer through the public entry points.
- `platform/engine.js` is the only file that creates the drawing surface, reads the URL and runs the loop. Others import `surface`, `FLAGS`, `MOBILE` and `clock` from it.
- Features don't import each other. They talk through `game/events.js` or a registry.
- A feature owns its save slice and its `*-data.js`.
- `lib/` and `*-data.js` import no engine or DOM code and have tests. So does `world/`, which runs in node.
- A new feature goes in `src/features/<name>/` and is registered in `src/features/index.js`.

## Checking

`just check` (syntax, layer rules through `tools/coupling-report.mjs` and `architecture.json`, and types: `tsc` checks the plain JavaScript and its JSDoc against `jsconfig.json`, emitting nothing) and `just test`. `just dead` lists modules, exports and assets nothing uses; it only reports.

`just bench` times frames in Playwright's Firefox, pinned through `package.json` (`just install-bench` once): headless, muted, a fresh profile, at 1440x900 and pixel ratio 2 unless `--size` and `--dpr` say otherwise. Each argument is a run (`"debug&shot=bot"`); add `|js` to run code in the page before timing, `--repeat 2` to interleave runs through a busy machine, and `--shots DIR` to save a screenshot of each. It prints page and console errors as they happen. 60 fps with p95 under ~18 ms is healthy.

## The surface

`engine.js` makes one canvas. `fitSurface(w, h)` sets the logical field (Comet's view asks for 1280 × 720); the canvas is then sized to the largest rectangle of that aspect the window holds, centred on the black page. Its backing store is the CSS size times the device pixel ratio, capped at 2, and `surface.scale` is backing pixels per logical pixel. It refits on resize and when the pixel ratio changes, and bumps `surface.version` so drawing code can resize anything it keeps.

The loop runs `update(dt)` at a fixed 60 Hz and `draw(dt)` once a display frame. `clock.speed` scales the fixed steps (slow motion and fast forward under `?debug`).

## The run

Read this when changing the rules, the field's look or the screens.

`world/sim.js` is a fixed-step port of the first version's rules: `step(world, dt, held, pressed, bias)`, with every number in `world/comet-data.js` and the same xorshift32 seed, so a run replays exactly. It queues sounds in `world.sfx` for the `run` feature to play. Distances are screen pixels on a 1280 × 720 field with y down.

`render/field.js` draws a world with the 2D context: shapes in field units under a transform of `surface.scale`, back to front (the deadly edge and its frame, hazards, anchor rings, tether, motes, trail, 1UP ring, comet, crash flash). Words are drawn in the bitmap font of `lib/pixel-font.js` onto canvases of their own at the surface's real resolution (`ui/word-layer.js`), so every font pixel lands on whole device pixels, and only when their text changes: the HUD (`ui/hud.js`) at most about 15 times a second, the screens' messages and prompt in `features/run/view.js`. It keeps the first version's palette (`render/palette.js`) and layout, and nothing glows.

`features/run/index.js` runs the screens: title (`menu`) → `play` → `paused` or `over`. Closing the game-over screen emits `run-ended { score }`; `features/scores` asks for initials on a card when the score makes the ten, saves it in its `scores` slice and emits `scores-done`, and the run goes back to the title. The run reads the best score through the `best()` hook (`loop.sections('best')`). Its sounds are WAVs in `assets/audio/`, loaded with `sfx.load()`; the swing and pulse loops run through `sfx.loop(name, volume, pitch)`, held at 0 when silent. The sound setting is `core`. The save is one localStorage key, `comet-save-v1`; 1.0.0's `comet` slice is moved to `scores` on load.

On a touch screen `ui/touch.js` shows a stick, the SWING button and, during a run, a pause button.

## Debug flags

Add to the URL. `?debug` is needed for `shot` and `speed`.

| Flag | Does |
|---|---|
| `?debug` | readout, `window.game`, keys: 1 slow motion, 2 fast forward |
| `?shot=play`, `bot`, `over`, `initials` | skip to a run, a run played by a simple pilot, the game over, the initials entry |
| `?speed=4` | game speed |
| `?mute` | no sound |
