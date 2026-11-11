import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SFX_DEFS } from '../../src/audio/sfx-defs.js';

test('every sound builds, says what it means and is not silent', ()=>
{
    for (const [name, def] of Object.entries(SFX_DEFS))
    {
        assert.ok(def.says, name);
        const data = def.make();
        assert.ok(data.length > 0, name);
        assert.ok(data.every(Number.isFinite), `${name} has a bad sample`);
        assert.ok(data.some((x)=> Math.abs(x) > .05), `${name} is silent`);
    }
});
