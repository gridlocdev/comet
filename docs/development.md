# Development

Comet is plain JavaScript ES modules on one 2D canvas, with no bundler and no runtime dependencies. The rules in `AGENTS.md` at the repository root apply to everyone working on it, and the code layout and its layer rules are in [architecture.md](architecture.md).

## Getting set up

You need Python 3 and [just](https://github.com/casey/just). Node.js runs the checks and tests.

```bash
just                 # list the recipes
just serve           # serve the game on http://localhost:8142
just play            # serve the game and open it in your browser
just lan             # serve the game to your Wi-Fi, to try it on a phone
just check           # syntax-check every module, check the layer rules and type-check against jsconfig.json
just test            # run the unit tests
just dead            # list modules, exports and assets nothing uses (it only reports)
just install         # install the pinned Playwright (only `just bench` needs it)
just install-bench   # install Playwright and its Firefox build, about 100 MB, once per Playwright version
just bench <runs>    # time frames in Playwright's Firefox, headless and muted
```

The game must be served over HTTP; ES modules don't load from `file://`. Without just: `python3 -m http.server 8142`.

## Checking your work

Run both after every change:

```bash
just check   # syntax, layer rules (tools/coupling-report.mjs, architecture.json) and types (jsconfig.json)
just test    # unit tests for lib/, *-data.js, the sim and the rules
```

## Debug flags

Add `?debug` to the URL for a readout and slow motion (`1`) or fast forward (`2`). `?debug&shot=bot` plays a run with a simple pilot. The full list is in [architecture.md](architecture.md#debug-flags).

## Performance

`just bench` times frames in Playwright's pinned Firefox. Each argument is one run, for example:

```bash
just bench "" "debug&shot=play" "debug&shot=bot" --shots /tmp/shots
```

60 fps with p95 under about 18 ms is healthy. The options are in [architecture.md](architecture.md#checking).

## Deploying

The game is deployed to [gridloc.dev/games/comet](https://gridloc.dev/games/comet/) as static files: `index.html`, `src/` and `assets/`. A release is a `vX.Y.Z` tag on GitHub, with the version in `package.json`.
