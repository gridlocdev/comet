// The top ten: three letters and a score each, kept in the save. When a run's results close, a score that makes the
// ten asks for initials on a card; either way it then announces 'scores-done'.
//   listens: 'run-ended' { score }      emits: 'scores-done'      hook: best() → the top score
import { sfx } from '../../audio/sfx.js';
import { cards } from '../../ui/cards.js';
import { showInitials } from '../../ui/initials.js';
import { insertScore, qualifies, topScore } from '../../lib/high-scores.js';

let save = null, asking = false;

export default {
    id: 'scores',
    build({ state, events })
    {
        save = state.slice('scores', { table: [], lastName: 'AAA' });
        events.on('run-ended', ({ score })=>
        {
            if (!qualifies(save.table, score)) { events.emit('scores-done'); return; }
            asking = true;
            showInitials({
                start: save.lastName ?? 'AAA',
                change: ()=> sfx.play('letterChange'),
                move: ()=> sfx.play('uiMove'),
                done(name)
                {
                    asking = false;
                    save.table = insertScore(save.table, name, score);
                    save.lastName = name;
                    state.write();
                    sfx.play('uiPick');
                    events.emit('scores-done');
                },
            });
        });
    },
    update() { if (asking) cards.update(); },
    best: ()=> topScore(save.table),
};
