// The numbers for every sound effect, to check each one against its `says` sentence without hearing it.
//   node tools/sound-report.mjs [name ...]   (or just sounds)
// length    how long it lasts
// attack    time from the start to 90% of its peak: a few ms reads as an impact, tens of ms as a swell
// loudness  RMS over the part above a tenth of the peak, in dB below full scale; frequent sounds should sit lower
// bright    zero crossings per second, halved: a rough centre of its pitch content, higher is brighter or hissier
import { RATE } from '../src/lib/synth.js';
import { SFX_DEFS } from '../src/audio/sfx-defs.js';

const only = process.argv.slice(2);
const rows = [];
for (const [name, def] of Object.entries(SFX_DEFS))
{
    if (only.length && !only.includes(name)) continue;
    const s = def.make();
    let peak = 0, peakAt = 0;
    for (let i = 0; i < s.length; i++) if (Math.abs(s[i]) > peak) { peak = Math.abs(s[i]); peakAt = i; }
    let attack = 0;
    while (attack < peakAt && Math.abs(s[attack]) < peak * .9) attack++;
    let sum = 0, n = 0, crossings = 0;
    for (let i = 0; i < s.length; i++)
    {
        if (Math.abs(s[i]) > peak * .1) { sum += s[i] * s[i]; n++; }
        if (i && (s[i - 1] < 0) !== (s[i] < 0)) crossings++;
    }
    rows.push({
        family: def.family ?? '',
        sound: name + (def.loop ? ' (loop)' : ''),
        'length ms': Math.round(s.length / RATE * 1000),
        'attack ms': +(attack / RATE * 1000).toFixed(1),
        peak: +peak.toFixed(2),
        'loudness dB': +(10 * Math.log10(sum / Math.max(1, n) || 1e-12)).toFixed(1),
        'bright Hz': Math.round(crossings / (s.length / RATE) / 2),
        level: def.level ?? 1,
    });
}
rows.sort((a, b)=> a.family.localeCompare(b.family));
console.table(rows);
