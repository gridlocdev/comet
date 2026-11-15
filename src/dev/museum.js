// The museum (?debug&room=museum&exhibit=motion|closing|chain|lives): one running example of each of Comet's systems,
// with a sign saying what it does, the mistake to avoid and the files it lives in. The field is drawn at 72% so the
// sign sits beside it.
import { FLAGS } from '../platform/engine.js';
import { drawField } from '../render/field.js';
import { CONFIG, LEVEL, SCREEN } from '../world/comet-data.js';
import { latchRange } from '../player/comet.js';
import { mult } from '../world/score.js';
import { EXHIBITS } from './museum-data.js';
import { RUNNERS } from './museum-exhibits.js';
import { frame, grid, label, roomBar, sign } from './labels.js';

const K = .72, AT = { x: 10, y: 40 };
const SIDE = { x: 945, w: 325 };

export function museumRoom()
{
    let ex = EXHIBITS[0], run = RUNNERS[ex.id], s = run.build();
    const bar = roomBar({ pages: EXHIBITS, param: 'exhibit', onPage: (i)=> { ex = EXHIBITS[i]; run = RUNNERS[ex.id]; s = run.build(); } });
    Object.assign(window, { room: { name: 'museum', exhibits: EXHIBITS.map((e)=> e.id), check: ()=> ({ id: ex.id, ...run.check(s) }) } });
    // ?fast runs the exhibit at 8× for the smoke run
    const fast = FLAGS.params.has('fast') ? 8 : 1;
    return {
        id: 'museum',
        update(dt)
        {
            bar.update();
            for (let i = 0; i < fast; i++) run.step(s, dt);
        },
        draw()
        {
            const g = frame();
            grid(g);
            g.save();
            g.translate(AT.x, AT.y); g.scale(K, K);
            g.beginPath(); g.rect(0, 0, SCREEN.w, SCREEN.h); g.clip();
            if (s.w) drawField(g, s.w);
            if (ex.id === 'closing') drawClosing(g, s.w);
            if (ex.id === 'chain') drawChain(g, s.chain);
            g.restore();
            g.strokeStyle = '#2a4458'; g.lineWidth = 1; g.strokeRect(AT.x, AT.y, SCREEN.w * K, SCREEN.h * K);
            run.readout(s).forEach((l, i)=> label(g, l, AT.x, AT.y + SCREEN.h * K + 12 + i * 18, { align: 'left', size: 14 }));
            const h = sign(g, ex.title, ex.text, SIDE.x, AT.y, SIDE.w, ex.files);
            sign(g, 'Not like this', ex.wrong, SIDE.x, AT.y + h + 10, SIDE.w);
        },
        debug: ()=> ({ room: 'museum', exhibit: ex.id }),
    };
}

// each anchor's reach, and the anchors the edge will swallow, in red
function drawClosing(g, w)
{
    const reach = latchRange(w.t);
    g.lineWidth = 1.5;
    for (const [x, y] of LEVEL.anchors)
    {
        const lost = Math.min(x, y, SCREEN.w - x, SCREEN.h - y) - CONFIG.playerRadius < CONFIG.borderMax;
        g.strokeStyle = lost ? '#ff4d4d' : '#33ccff55';
        g.beginPath(); g.arc(x, y, reach, 0, Math.PI * 2); g.stroke();
        if (lost) { g.beginPath(); g.arc(x, y, 16, 0, Math.PI * 2); g.stroke(); }
    }
}

// the multiplier for every chain from 0 to 28, the current one lit
function drawChain(g, chain)
{
    const x0 = 120, y0 = 620, bw = 34, hk = 120;
    for (let c = 0; c <= 28; c++)
    {
        const h = mult(c) * hk;
        g.fillStyle = c === chain ? '#33ccff' : '#33ccff40';
        g.fillRect(x0 + c * bw, y0 - h, bw - 4, h);
        if (c % CONFIG.chainTier === 0) label(g, String(c), x0 + c * bw + bw / 2 - 2, y0 + 8, { size: 20 });
    }
    for (let m = 1; m <= CONFIG.chainMultMax; m++) label(g, `×${m}`, x0 - 16, y0 - m * hk - 10, { size: 20, align: 'right' });
    label(g, 'chain →', x0 + 29 * bw, y0 + 8, { size: 20, align: 'left' });
}
