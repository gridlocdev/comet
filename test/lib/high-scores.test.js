import { test } from 'node:test';
import assert from 'node:assert/strict';
import { insertScore, nextLetter, qualifies, sanitize, topScore } from '../../src/lib/high-scores.js';

test('the high-score table keeps the top ten, three letters each', ()=>
{
    let t = [];
    assert.ok(!qualifies(t, 0));
    for (let i = 1; i <= 12; i++) t = insertScore(t, 'ab1', i * 100);
    assert.equal(t.length, 10);
    assert.equal(topScore(t), 1200);
    assert.equal(t.at(-1).score, 300);
    assert.equal(t[0].name, 'ABA');
    assert.ok(!qualifies(t, 300));
    assert.ok(qualifies(t, 301));
    assert.equal(sanitize('x'), 'XAA');
    assert.equal(nextLetter('A', -1), 'Z');
    assert.equal(nextLetter('Z', 1), 'A');
});
