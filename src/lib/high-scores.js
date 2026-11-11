// A high-score table: the top ten, three letters each, as plain data a save can hold.
export const TABLE_SIZE = 10;
export const topScore = (table)=> table[0]?.score ?? 0;
export const qualifies = (table, score)=> score > 0 && (table.length < TABLE_SIZE || score > table[table.length - 1].score);
export const sanitize = (name)=> (String(name ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3)).padEnd(3, 'A');
// a new table with the score in its place, or the same table if it doesn't make the ten
export function insertScore(table, name, score)
{
    if (!qualifies(table, score)) return table;
    return [...table, { name: sanitize(name), score }].sort((a, b)=> b.score - a.score).slice(0, TABLE_SIZE);
}
export const nextLetter = (ch, dir)=> String.fromCharCode(65 + (((ch.charCodeAt(0) - 65 + dir) % 26) + 26) % 26);
