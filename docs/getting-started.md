# Getting started

You can play Comet online, or serve it from a copy of the code.

## What you need

- A current desktop or phone browser: Firefox, Chrome, Safari or Edge.
- A keyboard, a mouse, a gamepad or a touch screen.
- To run it from source: Python 3 and, optionally, [just](https://github.com/casey/just).

## Play online

Open [gridloc.dev/games/comet](https://gridloc.dev/games/comet/). On a phone the touch controls show on their own.

## Run it from source

The game is plain ES modules with nothing to build, but browsers don't load modules from `file://`, so serve the folder:

```bash
just play   # serve on http://localhost:8142 and open it in your browser
just serve  # serve only; then open http://localhost:8142
```

Without just: `python3 -m http.server 8142`.

## Play on a phone

```bash
just lan   # serve to your Wi-Fi and print the address to open on the phone
```

The phone must be on the same Wi-Fi network as the computer.

## First run

The game opens on the title. Press `Space`, the mouse button, gamepad A or **SWING** to start. Your top ten, your last initials and the sound setting are saved in the browser.
