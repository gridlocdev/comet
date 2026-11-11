import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CELL, FONT, measure, pixels } from '../../src/lib/pixel-font.js';

test('every glyph is a clean grid that fits the cell', ()=>
{
    for (const [ch, g] of Object.entries(FONT))
    {
        assert.ok(g.rows.length === 7 || g.rows.length === 8, `${ch} has 7 or 8 rows`);
        assert.ok(g.rows.length + 1 <= CELL);
        for (const r of g.rows) assert.match(r, new RegExp(`^[#.]{${g.w}}$`), `${ch} rows are all ${g.w} wide`);
    }
});

test('the letters, digits and marks a game screen needs are all there', ()=>
{
    const needed = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,·!?:^-/\'()+<>';
    for (const ch of needed) assert.ok(FONT[ch], `missing ${ch}`);
});

test('lines are measured with one pixel between letters', ()=>
{
    assert.equal(measure(''), 0);
    assert.equal(measure('A'), 5);
    assert.equal(measure('AI'), 5 + 1 + 3);
    assert.equal(measure('x1.0'), 5 + 1 + 3 + 1 + 1 + 1 + 5);
});

test('pixels sit below the empty top row and inside the line', ()=>
{
    const px = pixels('Hi!');
    const w = measure('Hi!');
    assert.ok(px.length > 0);
    for (const [x, y] of px) assert.ok(x >= 0 && x < w && y >= 1 && y < CELL);
    assert.deepEqual(pixels('l'), [0, 1, 2, 3, 4, 5, 6].map((y)=> [0, y + 1]));
});
