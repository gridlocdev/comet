// A run of Comet, and the screens around it: title → play → paused or over. Hold to latch onto an anchor and swing,
// let go to fly. The rules are in world/, the picture in view.js; this file runs the screens and the run's sound.
// When the game-over screen closes it announces 'run-ended' { score } and waits for 'scores-done' to show the title.
import { FLAGS } from '../../platform/engine.js';
import { loop } from '../../game/loop.js';
import { input } from '../../platform/input.js';
import { sfx } from '../../audio/sfx.js';
import { cards } from '../../ui/cards.js';
import { letterIn, spellOut } from '../../ui/kinetic.js';
import { settings } from '../../ui/settings.js';
import { touch } from '../../ui/touch.js';
import { pulsePitch, swingPitch } from '../../world/comet-data.js';
import { createWorld, reset, score, step } from '../../world/sim.js';
import { pressWord, render } from './view.js';

/** @type {Record<string, [file: string, level: number]>} each sound's file and level */
const SOUNDS = {
    cometSnap: ['release_snap.wav', .5], cometChime: ['mote_chime.wav', .45], cometCrash: ['crash.wav', .6],
    cometUi: ['ui_select.wav', .4], cometSwing: ['swing_loop.wav', .35], cometPulse: ['pulse_loop.wav', .4],
};
const SFX_NAME = { snap: 'cometSnap', chime: 'cometChime', crash: 'cometCrash' };

let mode = 'menu';      // menu | play | paused | over | scores (the top ten has the screen)
let modeTime = 0;
let world = null, ctx = null;
let finalScore = 0, newBest = false;
let bot = null;

function setMode(m) { mode = m; modeTime = 0; }

// the title: the SWING button starts a run, so the touch controls show without pause
function toMenu()
{
    setMode('menu');
    reset(world);
    showTouch(false);
}

function showTouch(pausable)
{
    touch.show(true, { pausable });
    touch.holdLabel('SWING');
}

function startRun()
{
    sfx.play('cometUi');
    reset(world);
    setMode('play');
    showTouch(true);
}

function quiet() { sfx.loop('cometSwing', 0); sfx.loop('cometPulse', 0); }

function showPause()
{
    setMode('paused');
    quiet();
    touch.show(false);
    const label = (k, n)=> `${n}: ${settings.get(k) ? 'on' : 'off'}`;
    cards.show(`
        <div class="banner" style="color:var(--cyan)"></div>
        <div class="col">
            <button class="btn" id="c-go">Resume</button>
            <button class="btn" id="c-sound">${label('sound', 'Sound')}</button>
            <button class="btn" id="c-menu">End the run</button>
        </div>
    `);
    const root = cards.root;
    letterIn(spellOut(root.querySelector('.banner'), 'PAUSED'), { stagger: 28, dur: 300 });
    const back = ()=> { sfx.play('uiMove'); cards.hide(); showTouch(true); setMode('play'); };
    cards.menu([
        [{ el: root.querySelector('#c-go'), pick: back }],
        [{ el: root.querySelector('#c-sound'), pick()
        {
            const on = settings.toggle('sound');
            root.querySelector('#c-sound').textContent = `Sound: ${on ? 'on' : 'off'}`;
            sfx.setEnabled(on);
            sfx.play('uiPick');
        } }],
        [{ el: root.querySelector('#c-menu'), pick: ()=> { sfx.play('uiMove'); cards.hide(); toMenu(); } }],
    ], { back, move: ()=> sfx.play('uiMove') });
}

// the best score so far, from whichever feature keeps it
const best = ()=> Math.max(0, ...loop.sections('best'));

// the results are closed: the top ten may take the screen, and says when it's done
function endRun()
{
    setMode('scores');
    touch.show(false);
    ctx.events.emit('run-ended', { score: finalScore });
}

function gameOver()
{
    quiet();
    finalScore = score(world);
    newBest = finalScore > best();
    setMode('over');
    showTouch(false);
}

function playSounds()
{
    for (const e of world.sfx) sfx.play(SFX_NAME[e.id], 1, e.pitch);
    world.sfx.length = 0;
    const p = world.player;
    const live = mode === 'play' && world.life !== 'dead' && !world.gameOver;
    sfx.loop('cometSwing', live && p.latched ? 1 : 0, swingPitch(p.v));
    sfx.loop('cometPulse', live ? 1 : 0, pulsePitch(world.t));
}

// a simple pilot for screenshots: swing about half a turn, let go, catch the next anchor in reach
function autoPilot()
{
    const p = world.player;
    if (p.latched) { bot.flewAt = world.t; return p.swept < bot.turn; }
    if (world.t - bot.flewAt < .2) bot.turn = 1.6 + Math.random() * 2;
    return world.life === 'active' && world.t - bot.flewAt > .25;
}

export default {
    id: 'comet',
    build(c)
    {
        ctx = c;
        world = createWorld();
        c.events.on('scores-done', ()=> { if (mode === 'scores') toMenu(); });
        for (const [name, [file, level]] of Object.entries(SOUNDS)) sfx.load(name, `assets/audio/${file}`, level);
        // audio starts on the first key or tap; a saved 'sound off' keeps it from starting at all
        if (!settings.get('sound')) sfx.setEnabled(false);
        touch.onPause(()=> { if (mode === 'play') showPause(); });
        toMenu();

        // ?debug&shot=play | bot | over | initials
        const start = FLAGS.debug ? FLAGS.params.get('shot') : null;
        if (start === 'play' || start === 'bot') startRun();
        if (start === 'bot') bot = { turn: 2.5, flewAt: 0 };
        if (start === 'over' || start === 'initials') { startRun(); world.eventPoints = 4210; world.gameOver = true; gameOver(); }
        if (start === 'initials') endRun();
    },
    update(dt)
    {
        modeTime += dt;
        if (mode === 'paused') { cards.update(); return; }
        if (mode === 'scores') return;
        if (mode === 'menu')
        {
            if (modeTime < .2) return;
            if (input.holdPressed() || input.confirm()) startRun();
            return;
        }
        if (mode === 'play')
        {
            if (input.pause()) { showPause(); return; }
            const m = input.move();
            const held = bot ? autoPilot() : input.hold();
            const pressed = bot ? world.life === 'dead' : input.holdPressed();
            step(world, dt, held, pressed, { x: m.x, y: -m.y });
            playSounds();
            if (world.gameOver) gameOver();
            return;
        }
        if (mode === 'over')
        {
            world.sfx.length = 0;
            if (modeTime < 1.2) return;
            if (input.holdPressed() || input.confirm() || input.back())
                endRun();
        }
    },
    draw(dt)
    {
        const word = pressWord(input.hasPad);
        const hi = best();
        let ui;
        if (mode === 'menu') ui = { field: false, hud: false, message: 'title', info: { hi }, prompt: word };
        else if (mode === 'over') ui = { field: false, hud: false, message: 'over', info: { score: finalScore, best: newBest, hi: Math.max(hi, finalScore) }, prompt: modeTime > 1.2 ? word : '' };
        else ui = { field: true, hud: true, message: world.life === 'dead' ? 'crashed' : '', info: {}, prompt: world.life === 'dead' ? `${word} TO RESPAWN` : '', hi };
        render(world, ui, dt);
    },
    debug() { return { mode, t: +(world?.t ?? 0).toFixed(1), score: world ? score(world) : 0, lives: world?.lives, chain: world?.chain, life: world?.life }; },
};
