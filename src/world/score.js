// The score: points from distance flown and from events, both multiplied by the chain of good swings.
import { CONFIG } from './comet-data.js';

// the score multiplier for a chain of good swings: +0.5 every 4, up to ×4
export const mult = (chain, c = CONFIG)=> Math.max(1, Math.min(c.chainMultMax, 1 + Math.floor(chain / c.chainTier) * c.chainMultStep));

export const score = (w)=> Math.floor(w.scoreAccum) + w.eventPoints;
