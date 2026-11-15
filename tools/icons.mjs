// Draws the home-screen icons from the game's own shapes and palette: icons/apple-touch-icon.png (180 px, iOS),
// icons/icon-192.png and icons/icon-512.png (manifest.json; the 512 is also the maskable one).
//
//   node tools/icons.mjs        (just icons)
//
// The picture is a moment of play: the comet swinging round a cyan anchor on its tether, its trail fading behind it,
// a mote ahead. Each icon is full-bleed and opaque, black edge to edge with no rounded corners of its own: the phone
// rounds it, and a transparent margin showed on an iPhone as no icon at all. Everything sits inside the middle 80%, so
// Android's round masks don't cut it. Shapes are in units of the icon's width and drawn with 4 × 4 samples a pixel.
import fs from 'node:fs';
import zlib from 'node:zlib';
import { C } from '../src/render/palette.js';

const OUT = 'icons';
const rgb = (hex)=> [1, 3, 5].map((i)=> parseInt(hex.slice(i, i + 2), 16));

// the swing: the anchor, the comet on a circle round it, the trail behind along that circle
const ANCHOR = [.36, .38], RADIUS = .3, AT = 55 * Math.PI / 180, TRAIL = 70 * Math.PI / 180;
const COMET = [ANCHOR[0] + RADIUS * Math.cos(AT), ANCHOR[1] + RADIUS * Math.sin(AT)];
const MOTE = [.3, .76];            // ahead, where the comet is heading

const dist = (x, y, [cx, cy])=> Math.hypot(x - cx, y - cy);
// distance from (x, y) to the segment a–b
function toSegment(x, y, [ax, ay], [bx, by])
{
    const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - ax - t * dx, y - ay - t * dy);
}

// the colour and opacity on top at a point, back to front as the field draws them
function shade(x, y)
{
    let col = [0, 0, 0];
    const over = (hex, a)=> { const c = rgb(hex); col = col.map((v, i)=> v + (c[i] - v) * a); };
    if (Math.abs(dist(x, y, ANCHOR) - .075) < .018) over(C.anchor, 1);
    if (toSegment(x, y, ANCHOR, COMET) < .009) over(C.tether, 1);
    if (dist(x, y, MOTE) < .05) over(C.mote, 1);
    // the trail: along the circle behind the comet, thin and faint at its tail
    const ang = Math.atan2(y - ANCHOR[1], x - ANCHOR[0]), back = AT - ang;
    if (back > 0 && back < TRAIL)
    {
        const f = 1 - back / TRAIL;
        if (Math.abs(dist(x, y, ANCHOR) - RADIUS) < .006 + .02 * f) over(C.trail, f);
    }
    if (dist(x, y, COMET) < .06) over(C.comet, 1);
    return col;
}

function draw(size)
{
    const px = Buffer.alloc(size * size * 3), N = 4;
    for (let py = 0; py < size; py++) for (let qx = 0; qx < size; qx++)
    {
        const sum = [0, 0, 0];
        for (let sy = 0; sy < N; sy++) for (let sx = 0; sx < N; sx++)
        {
            const c = shade((qx + (sx + .5) / N) / size, (py + (sy + .5) / N) / size);
            for (let i = 0; i < 3; i++) sum[i] += c[i];
        }
        px.set(sum.map((v)=> Math.round(v / (N * N))), (py * size + qx) * 3);
    }
    return png(size, px);
}

// a truecolour PNG with no alpha
function png(size, px)
{
    const rows = Buffer.alloc((size * 3 + 1) * size);
    for (let y = 0; y < size; y++) px.copy(rows, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
    const head = Buffer.alloc(13);
    head.writeUInt32BE(size, 0); head.writeUInt32BE(size, 4);
    head[8] = 8; head[9] = 2;                       // 8 bits, RGB
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', zlib.deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function chunk(type, data)
{
    const len = Buffer.alloc(4), crc = Buffer.alloc(4), body = Buffer.concat([Buffer.from(type), data]);
    len.writeUInt32BE(data.length);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
}
function crc32(buf)
{
    let c = ~0;
    for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; }
    return ~c >>> 0;
}

fs.mkdirSync(OUT, { recursive: true });
for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]])
{
    fs.writeFileSync(`${OUT}/${name}`, draw(size));
    console.log(`wrote ${OUT}/${name} (${size} × ${size})`);
}
