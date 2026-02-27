import dictionary from './dictionary.js';
import { rankFirstThreeWordTrios } from './longwordle-tools.js';
import { _head } from './util.js';

const dictSize = dictionary.length;
const trios = dictSize ** 3 / 6;
const limit = 1000 * 1000 ** 2;
console.log(`Dictionary size: ${dictSize} words`);
console.log(`Calculating trio rankings of ~${trios} word trios...`);
console.log(`Limited to the first ${limit} trios (~${(limit / trios * 100).toFixed(1)}%)`);
const ranking = rankFirstThreeWordTrios(dictionary, 0.99, limit);

console.log('Top 50 word trios:');
console.log(_head(ranking, 500));

// const ranking = rankWordsAfterResults([
//   'measurably',
//   'photogenic',
//   'dressmaker',
//   'defensemen',
//   'slaveowner',
//   'mizzenmast',
//   'exhaustion',
//   'equestrian',
//   'journalist',
// ], [
//   [2, 1, 0, 0, 0, 1, 2, 0, 0, 1],
//   [0, 0, 1, 0, 0, 0, 1, 1, 0, 0],
//   [0, 0, 1, 0, 0, 2, 2, 2, 2, 2],
//   [0, 0, 0, 2, 1, 0, 0, 1, 2, 0],
//   [0, 0, 1, 0, 1, 1, 0, 1, 2, 2],
//   [2, 0, 0, 0, 1, 1, 1, 1, 0, 0],
//   [1, 0, 0, 1, 0, 0, 0, 0, 1, 1],
//   [1, 0, 0, 2, 0, 0, 1, 0, 1, 1],
//   [0, 2, 0, 1, 1, 1, 0, 0, 0, 0],
// ], dictionary);

// console.log(_head(ranking, 50));