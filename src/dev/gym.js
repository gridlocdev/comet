// The gym (?debug&room=gym&row=latch|swing|perfect): a row of cases for each way the comet meets the world, built
// from the tuning (gym-data.js) and run by the real rules (gym-lanes.js). Each case is labelled with its number and
// its band: green easy, orange hard, red can't be done. Hold the button (Space, A, the hold button) to play the latch
// row and the bottom swing; the others run themselves. ?bot holds the button for you.
import { FLAGS } from '../platform/engine.js';
import { input } from '../platform/input.js';
import { drawField } from '../render/field.js';
import { sfx } from '../audio/sfx.js';
import { WORLD_SFX } from '../audio/sfx-defs.js';
import { touch } from '../ui/touch.js';
import { CONFIG } from '../world/comet-data.js';
import { latchRange, swingLimit } from '../player/comet.js';
import { BAND_LOOK } from './gym-data.js';
import { buildGym, stepRow, verdicts } from './gym-lanes.js';
import { frame, grid, label, line, roomBar, sign } from './labels.js';

const deg = (rad)=> rad * 180 / Math.PI;
// where each row's sign goes, clear of its cases
const SIGN_AT = { latch: [20, 600, 820], swing: [20, 20, 760], perfect: [700, 20, 560] };

export function gymRoom()
{
    const rows = buildGym();
    let row = rows[0];
    const bar = roomBar({ pages: rows, param: 'row', onPage: (i)=> { row = rows[i]; } });
    touch.show(true, { pausable: false });
    const bot = FLAGS.params.has('bot');
    Object.assign(window, { room: { name: 'gym', rows, verdicts: ()=> rows.map((r)=> ({ row: r.id, cases: verdicts(r) })) } });
    return {
        id: 'gym',
        update()
        {
            bar.update();
            const held = bot || input.hold(), pressed = bot || input.holdPressed();
            for (const e of stepRow(row, held, pressed)) sfx.play(WORLD_SFX[e.id], .6, e.pitch);
            const you = row.lanes.find((l)=> l.you);
            sfx.loop('swingLoop', you && !you.waiting && you.w.player.latched ? 1 : 0, 1);
        },
        draw()
        {
            const g = frame();
            grid(g);
            DRAW[row.id](g, row);
            for (const lane of row.lanes) drawField(g, lane.w);
            for (const lane of row.lanes) caseLabel(g, row.id, lane);
            const [x, y, w] = SIGN_AT[row.id];
            sign(g, row.title, row.sign, x, y, w);
        },
        debug: ()=> ({ room: 'gym', row: row.id }),
    };
}

const look = (lane)=> BAND_LOOK[lane.c.band] ?? { colour: '#fff', word: '' };

// each row's measuring marks, drawn under the comets
const DRAW = {
    latch(g, row)
    {
        g.setLineDash([4, 6]);
        for (const lane of row.lanes)
        {
            const [ax, ay] = lane.anchors[0], x = ax - lane.c.value;
            line(g, x, 40, x, 620, '#ffffff30');                                 // the comet's path
            g.strokeStyle = look(lane).colour; g.globalAlpha = .45;
            g.beginPath(); g.arc(ax, ay, latchRange(lane.w.t), 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
            line(g, x, ay, ax, ay, look(lane).colour);                           // the distance
        }
        g.setLineDash([]);
    },
    swing(g, row)
    {
        for (const lane of row.lanes)
        {
            if (lane.you) continue;
            const [ax, ay] = lane.anchors[0], a = Math.min(lane.c.value, 359) * Math.PI / 180;
            g.strokeStyle = look(lane).colour; g.lineWidth = 3; g.globalAlpha = .6;
            g.beginPath(); g.arc(ax, ay, 76, -Math.PI / 2, -Math.PI / 2 + a); g.stroke(); g.globalAlpha = 1; g.lineWidth = 1;
        }
        // the meter for yours: degrees swept, the minimum to count and the snap
        const you = row.lanes.find((l)=> l.you), x0 = 760, x1 = 1240, y = 640, max = deg(swingLimit()) * 1.05;
        const at = (d)=> x0 + (x1 - x0) * Math.min(1, d / max);
        g.fillStyle = BAND_LOOK.red.colour; g.fillRect(x0, y, at(deg(CONFIG.minArc)) - x0, 8);
        g.fillStyle = BAND_LOOK.green.colour; g.fillRect(at(deg(CONFIG.minArc)), y, at(deg(swingLimit()) * .8) - at(deg(CONFIG.minArc)), 8);
        g.fillStyle = BAND_LOOK.orange.colour; g.fillRect(at(deg(swingLimit()) * .8), y, at(deg(swingLimit())) - at(deg(swingLimit()) * .8), 8);
        g.fillStyle = BAND_LOOK.red.colour; g.fillRect(at(deg(swingLimit())), y, x1 - at(deg(swingLimit())), 8);
        const swept = you.w.player.latched ? deg(you.w.player.swept) : 0;
        g.fillStyle = '#fff'; g.fillRect(at(swept) - 1, y - 6, 3, 20);
        label(g, `${Math.round(swept)}°`, at(swept), y + 18);
        label(g, `${Math.round(deg(CONFIG.minArc))}° counts`, at(deg(CONFIG.minArc)), y - 22, { size: 12 });
        label(g, `${CONFIG.maxSwingRotations} turns snaps`, at(deg(swingLimit())), y - 22, { size: 12 });
        label(g, you.waiting ? 'press and hold to swing' : 'let go to fly', 640, 470);
    },
    perfect(g, row)
    {
        const cone = CONFIG.perfectConeDeg * Math.PI / 180, range = CONFIG.perfectRange;
        for (const lane of row.lanes)
        {
            const [ax, ay] = lane.anchors[0], x = ax, y = ay - 36;
            g.fillStyle = '#ffffff06';
            g.beginPath(); g.moveTo(x, y); g.arc(x, y, range, -cone, cone); g.closePath(); g.fill();
            g.strokeStyle = '#ffffff30'; g.stroke();
        }
    },
};

function caseLabel(g, rowId, lane)
{
    const { colour, word } = look(lane);
    const [ax, ay] = lane.anchors[0];
    const shown = lane.shown ? `→ ${lane.shown}` : '';
    if (rowId === 'latch') { label(g, `${lane.c.label} ${word}`, ax - lane.c.value / 2, ay + 150, { colour }); label(g, shown, ax - lane.c.value / 2, ay + 168); }
    if (rowId === 'swing' && !lane.you) { label(g, `${lane.c.label} ${word}`, ax, ay + 96, { colour }); label(g, shown, ax, ay + 114); }
    if (rowId === 'swing' && lane.you) label(g, shown, ax, ay + 80);
    if (rowId === 'perfect') { label(g, `${lane.c.label} ${word}`, 40, ay - 44, { colour, align: 'left' }); label(g, shown, 40, ay - 26, { align: 'left' }); }
}
