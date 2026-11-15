// A run of Comet, and the screens around it: title → play → paused or over, and settings from the title or the pause
// menu. Hold to latch onto an anchor and swing,
// let go to fly. The rules are in world/, the picture in view.js; this file runs the screens and the run's sound.
// When the game-over screen closes it announces 'run-ended' { score } and waits for 'scores-done' to show the title.
import { FLAGS } from '../../platform/engine.js';
import { loop } from '../../game/loop.js';
import { input } from '../../platform/input.js';
import { sfx } from '../../audio/sfx.js';
import { musicCutIn, setMusicArea, setMusicDuck } from '../../audio/music.js';
import { cards } from '../../ui/cards.js';
import { letterIn, spellOut } from '../../ui/kinetic.js';
import { showSettings } from '../../ui/settings-screen.js';
import { setting } from '../../game/settings.js';
import { touch } from '../../ui/touch.js';
import { CONFIG } from '../../world/comet-data.js';
import { createWorld, reset, step } from '../../world/sim.js';
import { score } from '../../world/score.js';
import { pressWord, render, settingsWord } from './view.js';

// the run's sound for each sound the rules queue
const SFX_NAME = { snap: 'release', chime: 'mote', crash: 'crash' };

// the swing loop's pitch follows speed, the pulse loop's follows the run's clock
const map = (x, a, b, c, d)=> c + (Math.max(a, Math.min(b, x)) - a) / (b - a) * (d - c);
const swingPitch = (v)=> map(v, CONFIG.vMin, CONFIG.vMax, .7, 2);
const pulsePitch = (t)=> map(t, 0, 230, 1, 2.2);

let mode = 'menu';      // menu | play | paused | settings | over | scores (the top ten has the screen)
let modeTime = 0;
let settingsFrom = 'menu';      // where the settings screen goes back to: 'menu' or 'paused'
const STEP = 1 / 60;
let acc = 0, pressHeld = false;     // Game speed: run time banked between steps, and a press waiting for the next step
let world = null, ctx = null;
let finalScore = 0, newBest = false;
let bot = null;

// the music dips under the pause menu and its settings, and keeps going
function setMode(m) { mode = m; modeTime = 0; setMusicDuck(m === 'paused' || m === 'settings' && settingsFrom === 'paused' ? .4 : 1); }

// the soundtrack follows the screen: the title's track on the title and its settings, the run's under play and pause,
// and the game-over sting once, then quiet until the title (music/, from tools/music/songs.js)
function musicFor()
{
    if (mode === 'play' || mode === 'paused' || mode === 'settings' && settingsFrom === 'paused') return 'play';
    if (mode === 'over' || mode === 'scores') return 'over';
    return 'title';
}

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
    sfx.play('runStart');
    reset(world);
    acc = 0; pressHeld = false;
    setMode('play');
    showTouch(true);
}

function quiet() { sfx.loop('swingLoop', 0); sfx.loop('pulseLoop', 0); }

function showPause(focus = 0)
{
    setMode('paused');
    quiet();
    touch.show(false);
    cards.show(`
        <div class="banner" style="color:var(--cyan)"></div>
        <div class="col">
            <button class="btn" id="c-go">Continue</button>
            <button class="btn" id="c-settings">Settings</button>
            <button class="btn" id="c-restart">Restart</button>
            <button class="btn" id="c-menu">Quit to title</button>
        </div>
    `);
    const root = cards.root;
    letterIn(spellOut(root.querySelector('.banner'), 'PAUSED'), { stagger: 28, dur: 300 });
    const back = ()=> { sfx.play('uiMove'); cards.hide(); showTouch(true); setMode('play'); };
    cards.menu([
        [{ el: root.querySelector('#c-go'), pick: back }],
        [{ el: root.querySelector('#c-settings'), pick: ()=> { sfx.play('uiPick'); openSettings('paused'); } }],
        [{ el: root.querySelector('#c-restart'), pick: ()=> confirm('Restart the run?', 2, ()=> { cards.hide(); startRun(); }) }],
        [{ el: root.querySelector('#c-menu'), pick: ()=> confirm('Quit to the title? This run will end.', 3, ()=> { cards.hide(); toMenu(); }) }],
    ], { focus: [focus, 0], back, move: ()=> sfx.play('uiMove') });
}

// Restart and Quit lose the run, so each asks first; No is focused, and No or Back returns to the pause menu
function confirm(question, from, yes)
{
    sfx.play('uiMove');
    cards.show(`
        <div class="ask">${question}</div>
        <div class="row-btns">
            <button class="btn" id="c-no">No</button>
            <button class="btn" id="c-yes">Yes</button>
        </div>
    `);
    const root = cards.root;
    const no = ()=> { sfx.play('uiMove'); showPause(from); };
    cards.menu([[
        { el: root.querySelector('#c-no'), pick: no },
        { el: root.querySelector('#c-yes'), pick: ()=> { sfx.play('uiPick'); yes(); } },
    ]], { back: no, move: ()=> sfx.play('uiMove') });
}

// settings, from the title or the pause menu; Back returns there
function openSettings(from)
{
    settingsFrom = from;
    setMode('settings');
    touch.show(false);
    showSettings({
        color: 'var(--cyan)',
        sound: (what)=> sfx.play(what === 'move' ? 'uiMove' : what === 'pick' ? 'uiPick' : 'mote'),
        close()
        {
            if (settingsFrom === 'paused') { showPause(1); return; }
            cards.hide();
            toMenu();
        },
    });
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
    sfx.loop('swingLoop', live && p.latched ? 1 : 0, swingPitch(p.v));
    sfx.loop('pulseLoop', live ? 1 : 0, pulsePitch(world.t));
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
        setMusicArea(musicFor);
        musicCutIn('over');     // the run's end stops the run's music at once, with no wait for the bar
        c.events.on('scores-done', ()=> { if (mode === 'scores') toMenu(); });
        // the touch pause button pauses a run, and on the title opens the settings
        touch.onPause(()=> { if (mode === 'play') showPause(); else if (mode === 'menu') openSettings('menu'); });
        toMenu();

        // ?debug&shot=play | bot | pause | settings | over | initials
        const start = FLAGS.debug ? FLAGS.params.get('shot') : null;
        if (start === 'play' || start === 'bot') startRun();
        if (start === 'bot') bot = { turn: 2.5, flewAt: 0 };
        if (start === 'pause') { startRun(); showPause(); }
        if (start === 'settings') openSettings('menu');
        if (start === 'over' || start === 'initials') { startRun(); world.eventPoints = 4210; world.gameOver = true; gameOver(); }
        if (start === 'initials') endRun();
    },
    update(dt)
    {
        modeTime += dt;
        if (mode === 'paused' || mode === 'settings') { cards.update(); return; }
        if (mode === 'scores') return;
        if (mode === 'menu')
        {
            if (modeTime < .2) return;
            if (input.pause()) openSettings('menu');
            else if (input.holdPressed() || input.confirm()) startRun();
            return;
        }
        if (mode === 'play')
        {
            if (input.pause()) { showPause(); return; }
            const m = input.move();
            const held = bot ? autoPilot() : input.hold();
            pressHeld ||= bot ? world.life === 'dead' : input.holdPressed();
            // Game speed slows the run itself; menus and sounds keep their pace. A press waits for the next step.
            acc = Math.min(acc + dt * setting('a11y.gameSpeed'), STEP * 4);
            while (acc >= STEP && !world.gameOver)
            {
                step(world, STEP, held, pressHeld, { x: m.x, y: -m.y });
                pressHeld = false;
                acc -= STEP;
            }
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
        if (mode === 'menu' || mode === 'settings' && settingsFrom === 'menu')
            ui = { field: false, hud: false, message: 'title', info: { hi, settings: settingsWord(input.hasPad) }, prompt: word };
        else if (mode === 'over') ui = { field: false, hud: false, message: 'over', info: { score: finalScore, best: newBest, hi: Math.max(hi, finalScore) }, prompt: modeTime > 1.2 ? word : '' };
        else ui = { field: true, hud: true, message: world.life === 'dead' ? 'crashed' : '', info: {}, prompt: world.life === 'dead' ? `${word} TO RESPAWN` : '', hi };
        render(world, ui, dt);
    },
    debug() { return { mode, t: +(world?.t ?? 0).toFixed(1), score: world ? score(world) : 0, lives: world?.lives, chain: world?.chain, life: world?.life }; },
};
