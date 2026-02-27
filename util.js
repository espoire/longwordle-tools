/**
 * @param {Record<string, number>} obj
 * @returns {Record<string, number>} A new object with the iteration order of keys sorted by their corresponding values in descending order.
 */
export function _sortObjectByValue(obj, includeNonPositive = false) {
  const sortedKeys = Object.keys(obj).sort((a, b) => obj[b] - obj[a]);
  const sortedObj = {};

  for (const key of sortedKeys) {
    if (!includeNonPositive && obj[key] <= 0) continue;
    sortedObj[key] = obj[key];
  }

  return sortedObj;
}

/**
 * 
 * @param {Record<string, number>} obj
 * @param {number} length
 * @returns {Record<string, number>} The first N key-value pairs of the given object in iteration order, as a new object.
 */
export function _head(obj, length = 1) {
  const result = {};
  
  const keys = Object.keys(obj).slice(0, length);
  for (const key of keys) {
    result[key] = obj[key];
  }

  return result;
}

export function entropy(p) {
  if (p <= 0 || p >= 1) return 0;
  return p * Math.log2(1/p);
}