// The registry: every feature, in update order. A new feature goes in its own folder and is added here.
// scores comes first so it is listening before a run can end (?debug&shot=initials ends one while building).
import scores from './scores/index.js';
import run from './run/index.js';

export const features = [scores, run];
