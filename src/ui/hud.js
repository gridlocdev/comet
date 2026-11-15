// The HUD along the top of a run: score, best, lives, multiplier, motes to the next life and the run's clock, in the
// pixel font on its own layer. The score ticks every step, so it redraws about 15 times a second, but at once when a
// life comes or goes.
import { motesToNextLife } from '../world/motes.js';
import { mult, score } from '../world/score.js';
import { C } from '../render/palette.js';
import { centre, clear, dot, fitLayer, rightAt, text, wordLayer } from './word-layer.js';

const hud = wordLayer(112);
let age = 99, shownLives = -1;

// draw the HUD for world w onto g (in device pixels, at the field's top-left)
export function drawHud(g, w, hi)
{
    fitLayer(hud);
    const s = score(w), lives = w.lives;
    const key = `${s}|${hi}|${lives}|${w.earnedLives}|${w.chain}|${motesToNextLife(w)}|${Math.floor(w.t)}`;
    age++;
    if (!(key === hud.key || (age < 4 && lives === shownLives && hud.key)))
    {
        hud.key = key; age = 0; shownLives = lives;
        clear(hud);
        text(hud, `SCORE ${s}`, 24, 18, 32, C.white);
        centre(hud, `HI ${hi}`, 22, 20, C.dim);
        // one dot a life; the ones earned from motes are yellow
        for (let i = 0; i < lives; i++) dot(hud, 1256 - i * 16, 26, 8, i >= lives - w.earnedLives ? C.mote : C.white);
        const k = mult(w.chain);
        text(hud, `x${k.toFixed(1)}`, 24, 56, 24, k > 1 ? C.gold : C.muted);
        dot(hud, 32, 96, 5, C.mote);
        text(hud, `${motesToNextLife(w)} TO 1UP`, 44, 88, 18, C.dim);
        const secs = Math.floor(w.t);
        rightAt(hud, `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, 1256, 52, 16, C.muted);
    }
    g.drawImage(hud.canvas, 0, 0);
}
