import dictionary from './dictionary.js';
import { _sortObjectByValue, entropy } from './util.js';
const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');

const hueristic = {
  inclusion: 1, // We value learning that a letter is in the multiset
  position: 2, // We value learning *exactly where* by about double
}

let cachedLetterOccurrenceRateTable;
/**
 * @returns {Record<string, number[]>} An object {a: number[], b: number[], ..., z: number[]} where the value for each letter is an array of occurrence rates: how many words with at least 1 of the letter, how many with at least 2, etc.
 */
export function buildLetterOccurrenceRateTable() {
  if (cachedLetterOccurrenceRateTable) return cachedLetterOccurrenceRateTable;

  const occurrence = {};

  // Fill table
  for (const letter of letters) {
    occurrence[letter] = getTimesLetterOccurredAtLeastSoManyTimes(letter, dictionary);
  }

  const dictSize = dictionary.length;
  for (const letter in occurrence) {
    for (let i = 0; i < occurrence[letter].length; i++) {
      // Normalize to dictionary size to get occurrence rates
      const rate = occurrence[letter][i] / dictSize;

      // Use entropy to estimate value of testing for this letter-count
      const score = entropy(rate);
      occurrence[letter][i] = score;
    }
  }

  cachedLetterOccurrenceRateTable = occurrence;
  return occurrence;
}

/**
 * @param {string} letter
 * @param {string[]} dictionary
 * @returns {number[]} An array where the value at index N represents the number of words in the dictionary that contain at least N+1 occurrences of the given letter. For example, if the letter is "b", and there are 100 words with at least 1 "b", 20 words with at least 2 "b"s, and 5 words with at least 3 "b"s, then the returned array would be [100, 20, 5].
 */
function getTimesLetterOccurredAtLeastSoManyTimes(letter, dictionary) {
  const ret = [];

  for (const word of dictionary) {
    const occurrences = countLetterInWord(letter, word);

    for (let i = 0; i < occurrences; i++) {
      ret[i] = (ret[i] ?? 0) + 1;
    }
  }

  return ret;
}

function countLetterInWord(letter, word) {
  const letterRegex = new RegExp(letter, 'g');
  const matches = word.match(letterRegex) ?? [];
  const count = matches.length;
  return count;
}

/**
 * @param {string[]} words The dictionary of possible word choices to analyze.
 * @returns {Array<Record<string, number>>} A length-10 array of {a: number, b: number, ..., z: number} objects, where the 0th object represents the occurrence rate of each letter at index zero in any word, the 1st object represents the occurrence rate of each letter at index one, etc.
 */
function buildLetterOccurrenceRateAtPositionTable(words) {
  // Build blank occurrence table
  const occurrence = [];
  for (let i = 0; i < 10; i++) {
    occurrence[i] = {};
    for (const letter of letters) occurrence[i][letter] = 0;
  }

  // Loop through words/positions and count letter occurrences
  for (const word of words) {
    for (let i = 0; i < word.length; i++) {
      const letter = word[i];
      occurrence[i][letter]++;
    }
  }

  const wordCount = words.length;
  for (let i = 0; i < occurrence.length; i++) {
    for (const letter of letters) {
      // Normalize results to word count to get probabilities
      const rate = occurrence[i][letter] / wordCount;

      // Use entropy to estimate value of testing for this letter-position
      const score = entropy(rate);
      occurrence[i][letter] = score;
    }
  }

  return occurrence;
}

/**
 * @returns {Record<string, number>} A table of letter codes (e.g. "a1", "a2", "b1", etc.) to their occurrence rates.
 */
function buildLetterValueTable() {
  const occurrence = buildLetterOccurrenceRateTable(dictionary);
  const allCodes = getUniqueLetterCodesList();

  for (const code of allCodes) {
    const letter = code[0];
    const ordinal = code[1];
    const score = occurrence[letter][ordinal-1] ?? 0;
    occurrence[code] = score;
  }

  return _sortObjectByValue(occurrence, true);
}

function scoreWords() {
  const letterScores = buildLetterValueTable();
  const wordScores = {};

  for (const word of dictionary) {
    wordScores[word] = scoreWord(letterScores, word);
  }

  return wordScores;
}

function scoreWord(letterScores, word) {
  let score = 0;

  const letterCodes = toLetterCodes(word);
  for (const code of letterCodes) {
    score += letterScores[code];
  }

  return score;
}

/** @type {Record<string, string[]>} */
const letterCodesCache = {};
/**
 * @param {string} word
 * @returns {string[]} An array of letter codes corresponding to the letters in the word. For example, "abbot" would return ["a1", "b1", "b2", "o1", "t1"].
 */
function toLetterCodes(word) {
  if (letterCodesCache[word] != null) return letterCodesCache[word];

  const letters = {};

  for (let i = 0; i < word.length; i++) {
    const l = word[i];
    letters[l] = (letters[l] ?? 0) + 1;
  }

  const codes = [];
  for (const letter in letters) {
    const count = letters[letter];
    for (let i = 0; i < count; i++) {
      codes.push(`${letter}${i+1}`);
    }
  }

  letterCodesCache[word] = codes;
  return codes;
}

export function rankFirstWords() {
  const wordScores = scoreWords();
  return _sortObjectByValue(wordScores);
}

export function rankFirstTwoWordPairs(words) {
  const letterScores = buildLetterValueTable();
  const pairScores = {};

  for (let i = 0; i < words.length; i++) {
    const word1 = words[i];
    for (let j = i+1; j < words.length; j++) {
      const word2 = words[j];

      const score = scoreWordPair(letterScores, word1, word2);
      pairScores[`${word1},${word2}`] = score;
    }
  }

  return _sortObjectByValue(pairScores);
}

function scoreWordPair(letterScores, word1, word2) {
  let score = 0;

  const codeSet = getCoveredLetterCodes(word1, word2);
  for (const code of codeSet) {
    score += letterScores[code];
  }

  return score;
}

function getCoveredLetterCodes(...words) {
  const coveredCodes = new Set();

  for (const word of words) {
    const letterCodes = toLetterCodes(word);
    for (const code of letterCodes) {
      coveredCodes.add(code);
    }
  }

  return coveredCodes;
}

/**
 * @param {string[]} words The dictionary of possible word choices to rank.
 * @param {*} cutoff A ratio of the best-known trio score below which to omit results (for data size reduction purposes).
 * @returns {Record<string, number>} A ranking of the best word trios from the given list, sorted by their likelihood of revealing new information.
 */
export function rankFirstThreeWordTrios(words, cutoff = 0.95, MAX_TRIALS = 1000 ** 2) {
  const letterScores = buildLetterValueTable();
  const letterPositionScores = buildLetterOccurrenceRateAtPositionTable(words);
  const trioScores = {};
  let best = 0;
  let trials = 0;

  for (let i = 0; i < words.length; i++) {
    const word1 = words[i];

    for (let j = i+1; j < words.length; j++) {
      const word2 = words[j];

      for (let k = j+1; k < words.length && trials < MAX_TRIALS; k++) {
        const word3 = words[k];

        const score = scoreWordTrio(letterScores, letterPositionScores, word1, word2, word3);

        trials++;

        if (score > best) best = score;
        if (score < best * cutoff) continue;
        trioScores[`${word1},${word2},${word3}`] = score;
      }
    }
  }

  return _sortObjectByValue(trioScores);
}

/**
 * @param {Record<string, number>} letterScores
 * @param {Array<Record<string, number>>} letterPositionScores For each position 0-9, the probability of each letter occurring.
 * @param {string} word1
 * @param {string} word2
 * @param {string} word3
 * @returns {number} The score of the word trio.
 */
function scoreWordTrio(letterScores, letterPositionScores, word1, word2, word3) {
  let inclusionScore = 0;

  // Score multiset inclusion
  const codeSet = getCoveredLetterCodes(word1, word2, word3);
  for (const code of codeSet) {
    inclusionScore += letterScores[code];
  }

  // Score positional information
  const positionCodes = new Set();
  for (const word of [word1, word2, word3]) {
    for (let i = 0; i < word.length; i++) {
      const letter = word[i];
      positionCodes.add(`${letter}${i}`);
    }
  }
  let positionScore = 0;
  for (const code of positionCodes) {
    const letter = code[0];
    const position = code[1];
    positionScore += letterPositionScores[position][letter];
  }

  return inclusionScore * hueristic.inclusion + positionScore * hueristic.position;
}

/**
 * @param {string[]} alreadyGuessed
 * @param {string[]} dictionary
 */
export function rankWordsAfter(alreadyGuessed, dictionary) {
  const wordScores = {};

  const letterScores = buildLetterValueTable();
  const alreadyCheckedLetterCodes = buildAlreadyCheckedLetterCodes(alreadyGuessed);

  for (const word of dictionary) {
    if (alreadyGuessed.includes(word)) continue;

    const score = scoreWordOmittingAlreadyChecked(letterScores, word, alreadyCheckedLetterCodes);
    wordScores[word] = score;
  }

  return _sortObjectByValue(wordScores);
}

/**
 * @param {string[]} alreadyGuessed
 * @returns {Set<string>} A set of letter codes like "a1", "b2", etc. that have already been checked.
 */
function buildAlreadyCheckedLetterCodes(alreadyGuessed) {
  const alreadyCheckedLetterCodes = new Set();

  for (const guess of alreadyGuessed) {
    const codes = toLetterCodes(guess);
    for (const code of codes) {
      alreadyCheckedLetterCodes.add(code);
    }
  }

  return alreadyCheckedLetterCodes;
}

function scoreWordOmittingAlreadyChecked(letterScores, word, alreadyCheckedLetterCodes) {
  let score = 0;
  const letterCodes = toLetterCodes(word);

  for (const code of letterCodes) {
    if (alreadyCheckedLetterCodes.has(code)) continue;
    score += letterScores[code];
  }

  return score;
}

/**
 * @param {string[]} alreadyGuessed A list of previous words.
 * @param {(0 | 1 | 2)[]} results The results from those guesses. 0 = letter not in word, 1 = letter in word but wrong place, 2 = letter in word and right place.
 * @param {string[]} dictionary The dictionary of words to rank.
 * @returns {Record<string, number>} A ranking of the remaining words in the dictionary, sorted by their likelihood of revealing new information.
 */
export function rankWordsAfterResults(alreadyGuessed, results, dictionary) {
  const allCodes = getUniqueLetterCodesList();

  const alreadyKnownCodes = new Set();
  for (let i = 0; i < alreadyGuessed.length; i++) {
    const guess = alreadyGuessed[i];
    const result = results[i];

    const { include, exclude } = getImpliedCodes(guess, result, allCodes);
    for (const code of include) alreadyKnownCodes.add(code);
    for (const code of exclude) alreadyKnownCodes.add(code);
  }

  const wordScores = {};
  const letterScores = buildLetterValueTable();
  for (const word of dictionary) {
    if (alreadyGuessed.includes(word)) continue;

    let score = 0;
    const letterCodes = toLetterCodes(word);

    for (const code of letterCodes) {
      if (alreadyKnownCodes.has(code)) continue;
      score += letterScores[code];
    }

    wordScores[word] = score;
  }

  return _sortObjectByValue(wordScores);
}

/**
 * @returns {string[]} A list of all letter codes (e.g. "a1", "a2", "b1", etc.) that can be used to calculate the information revealed by a guess.
 */
export function getUniqueLetterCodesList(letterOccurrenceRateTable = buildLetterOccurrenceRateTable()) {
  const codes = [];

  for (const letter in letterOccurrenceRateTable) {
    for (let i = 0; i < letterOccurrenceRateTable[letter].length; i++) {
      codes.push(`${letter}${i+1}`);
    }
  }

  return codes;
}

/**
 * @param {string} guess The guessed word.
 * @param {(0 | 1 | 2)[]} result The result of the guess, where 0 = letter not in word, 1 = letter in word but wrong place, 2 = letter in word and right place.
 *    From this, we can infer the possibility (or impossibility) of certain letter codes being in the target word.
 *    For example, if the guess contains two 'b's, and the result indicates only one 'b' is included, then we know that "b1" is included, AND "b2", "b3", etc. are NOT included.
 *    Conversely, if the result indicates that both 'b's are included, then we know that "b1" and "b2" are included, but know nothing about "b3", "b4", etc.
 * @returns {{ include: string[], exclude: string[] }} An object containing two lists of letter codes: those that are included in the target word, and those that are excluded, based on the guess and result.
 */
function getImpliedCodes(guess, result, allCodes = getUniqueLetterCodesList()) {
  const letterInfos = {};

  for (let i = 0; i < guess.length; i++) {
    const letter = guess[i];
    const res = result[i];

    if (!letterInfos[letter]) letterInfos[letter] = { count: 0, include: 0, exclude: false };
    letterInfos[letter].count++;

    if (res === 0) { // Letter not in word at all, so we can exclude any non-explicitly-included codes for this letter.
      letterInfos[letter].exclude = true;
    } else { // Letter in word. We can include an additional code for this letter.
      letterInfos[letter].include++;
    }
  }

  const include = [];
  const exclude = [];
  for (const letter in letterInfos) {
    const info = letterInfos[letter];

    let i;
    for (i = 0; i < info.include; i++) {
      include.push(`${letter}${i+1}`);
    }

    if (info.exclude) {
      for (; true; i++) {
        const code = `${letter}${i+1}`;
        if (!allCodes.includes(code)) break;
        exclude.push(code);
      }
    }
  }

  return { include, exclude };
}