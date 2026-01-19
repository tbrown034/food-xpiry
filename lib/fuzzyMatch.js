/**
 * Fuzzy matching utilities for spell correction and phonetic matching.
 * Used to match misspelled food items to known database entries.
 *
 * @module fuzzyMatch
 */

/**
 * Calculate the Levenshtein (edit) distance between two strings.
 * Measures the minimum number of single-character edits (insertions,
 * deletions, or substitutions) required to change one string into the other.
 *
 * Uses optimized algorithm with early termination when threshold is provided.
 *
 * @param {string} a - First string to compare
 * @param {string} b - Second string to compare
 * @param {number} [maxDistance] - Optional maximum distance for early termination
 * @returns {number} The edit distance between the two strings
 *
 * @example
 * levenshteinDistance('brocolli', 'broccoli') // → 1
 * levenshteinDistance('chiken', 'chicken')    // → 1
 * levenshteinDistance('milk', 'pork')         // → 3
 * levenshteinDistance('cat', 'cat')           // → 0
 */
export function levenshteinDistance(a, b, maxDistance = Infinity) {
  // Normalize inputs
  const strA = String(a).toLowerCase();
  const strB = String(b).toLowerCase();

  // Early returns for edge cases
  if (strA === strB) return 0;
  if (strA.length === 0) return strB.length;
  if (strB.length === 0) return strA.length;

  // If length difference exceeds max distance, no need to compute
  if (Math.abs(strA.length - strB.length) > maxDistance) {
    return maxDistance + 1;
  }

  // Ensure strA is the shorter string for space optimization
  const [shorter, longer] =
    strA.length <= strB.length ? [strA, strB] : [strB, strA];

  // Use single array instead of matrix (space optimization)
  const previousRow = Array(shorter.length + 1);

  // Initialize first row
  for (let i = 0; i <= shorter.length; i++) {
    previousRow[i] = i;
  }

  // Fill in the rest of the matrix
  for (let j = 1; j <= longer.length; j++) {
    let previousDiagonal = previousRow[0];
    previousRow[0] = j;

    let minInRow = j; // Track minimum value in current row for early termination

    for (let i = 1; i <= shorter.length; i++) {
      const currentDiagonal = previousRow[i];
      const cost = shorter[i - 1] === longer[j - 1] ? 0 : 1;

      previousRow[i] = Math.min(
        previousRow[i] + 1, // deletion
        previousRow[i - 1] + 1, // insertion
        previousDiagonal + cost // substitution
      );

      minInRow = Math.min(minInRow, previousRow[i]);
      previousDiagonal = currentDiagonal;
    }

    // Early termination: if minimum in row exceeds threshold, abort
    if (minInRow > maxDistance) {
      return maxDistance + 1;
    }
  }

  return previousRow[shorter.length];
}

/**
 * Determine the appropriate edit distance threshold based on word length.
 * Shorter words require stricter matching to avoid false positives.
 *
 * @param {string} word - The word to determine threshold for
 * @returns {number} The recommended threshold
 *
 * @example
 * getThresholdForWord('milk')      // → 1 (short word, strict)
 * getThresholdForWord('cheese')    // → 2 (medium word)
 * getThresholdForWord('asparagus') // → 3 (long word, lenient)
 */
function getThresholdForWord(word) {
  const length = word.length;
  if (length <= 4) return 1;
  if (length <= 7) return 2;
  return 3;
}

/**
 * Find the closest matching string from a list of candidates.
 * Returns null if no match is within the acceptable threshold.
 *
 * @param {string} input - The string to match
 * @param {string[]} candidates - Array of possible matches
 * @param {number} [threshold] - Maximum edit distance (auto-calculated if not provided)
 * @returns {{ match: string, distance: number } | null} Best match and its distance, or null
 *
 * @example
 * findClosestMatch('brocolli', ['broccoli', 'cabbage', 'carrot'])
 * // → { match: 'broccoli', distance: 1 }
 *
 * findClosestMatch('chikn', ['chicken', 'turkey', 'beef'])
 * // → { match: 'chicken', distance: 2 }
 *
 * findClosestMatch('xyz', ['chicken', 'beef'])
 * // → null (no match within threshold)
 */
export function findClosestMatch(input, candidates, threshold) {
  if (!input || !candidates || candidates.length === 0) {
    return null;
  }

  const normalizedInput = String(input).toLowerCase().trim();

  // Auto-calculate threshold if not provided
  const maxDistance = threshold ?? getThresholdForWord(normalizedInput);

  let bestMatch = null;
  let bestDistance = maxDistance + 1;

  for (const candidate of candidates) {
    const normalizedCandidate = String(candidate).toLowerCase().trim();

    // Quick check: if exact match (after normalization), return immediately
    if (normalizedInput === normalizedCandidate) {
      return { match: candidate, distance: 0 };
    }

    // Calculate distance with early termination optimization
    const distance = levenshteinDistance(
      normalizedInput,
      normalizedCandidate,
      bestDistance
    );

    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = candidate;
    }
  }

  // Only return if within threshold
  if (bestDistance <= maxDistance) {
    return { match: bestMatch, distance: bestDistance };
  }

  return null;
}

/**
 * Generate a Soundex code for phonetic matching.
 * Soundex encodes words based on their pronunciation in English,
 * which helps match words that sound similar but are spelled differently.
 *
 * Algorithm:
 * 1. Keep the first letter
 * 2. Replace consonants with digits based on phonetic groups
 * 3. Remove vowels, H, W, Y
 * 4. Remove consecutive duplicates
 * 5. Pad or truncate to 4 characters
 *
 * @param {string} word - The word to encode
 * @returns {string} 4-character Soundex code
 *
 * @example
 * soundex('chicken') // → 'C250'
 * soundex('chiken')  // → 'C250' (same as chicken!)
 * soundex('Robert')  // → 'R163'
 * soundex('Rupert')  // → 'R163' (same as Robert!)
 */
export function soundex(word) {
  if (!word || typeof word !== 'string') {
    return '0000';
  }

  // Normalize: uppercase, letters only
  const normalized = word.toUpperCase().replace(/[^A-Z]/g, '');

  if (normalized.length === 0) {
    return '0000';
  }

  // Soundex coding map
  // B, F, P, V → 1
  // C, G, J, K, Q, S, X, Z → 2
  // D, T → 3
  // L → 4
  // M, N → 5
  // R → 6
  // A, E, I, O, U, H, W, Y → 0 (removed)
  const soundexMap = {
    B: '1',
    F: '1',
    P: '1',
    V: '1',
    C: '2',
    G: '2',
    J: '2',
    K: '2',
    Q: '2',
    S: '2',
    X: '2',
    Z: '2',
    D: '3',
    T: '3',
    L: '4',
    M: '5',
    N: '5',
    R: '6',
    A: '0',
    E: '0',
    I: '0',
    O: '0',
    U: '0',
    H: '0',
    W: '0',
    Y: '0',
  };

  // Keep first letter
  let code = normalized[0];

  // Get code for first letter (needed for duplicate checking)
  let previousCode = soundexMap[normalized[0]] || '0';

  // Process remaining letters
  for (let i = 1; i < normalized.length && code.length < 4; i++) {
    const currentCode = soundexMap[normalized[i]] || '0';

    // Skip if same code as previous (consecutive duplicates)
    // Also skip vowels and H, W, Y (coded as '0')
    if (currentCode !== '0' && currentCode !== previousCode) {
      code += currentCode;
    }

    previousCode = currentCode;
  }

  // Pad with zeros to ensure 4 characters
  return (code + '0000').slice(0, 4);
}

/**
 * Find candidates that match phonetically using Soundex.
 * Returns all candidates with the same Soundex code as the input.
 *
 * @param {string} input - The string to match phonetically
 * @param {string[]} candidates - Array of possible matches
 * @returns {string[]} Array of phonetically matching candidates
 *
 * @example
 * findPhoneticMatch('chiken', ['chicken', 'turkey', 'beef', 'checkin'])
 * // → ['chicken', 'checkin'] (both have same soundex as 'chiken')
 *
 * findPhoneticMatch('yogart', ['yogurt', 'milk', 'cheese'])
 * // → ['yogurt']
 */
export function findPhoneticMatch(input, candidates) {
  if (!input || !candidates || candidates.length === 0) {
    return [];
  }

  const inputSoundex = soundex(input);
  const matches = [];

  for (const candidate of candidates) {
    if (soundex(candidate) === inputSoundex) {
      matches.push(candidate);
    }
  }

  return matches;
}

/**
 * Find the best phonetic match from candidates.
 * If multiple candidates have the same Soundex, returns the one
 * with the smallest Levenshtein distance.
 *
 * @param {string} input - The string to match
 * @param {string[]} candidates - Array of possible matches
 * @returns {{ match: string, soundexCode: string } | null} Best phonetic match or null
 *
 * @example
 * findBestPhoneticMatch('chiken', ['chicken', 'checking', 'turkey'])
 * // → { match: 'chicken', soundexCode: 'C250' }
 */
export function findBestPhoneticMatch(input, candidates) {
  const phoneticMatches = findPhoneticMatch(input, candidates);

  if (phoneticMatches.length === 0) {
    return null;
  }

  if (phoneticMatches.length === 1) {
    return {
      match: phoneticMatches[0],
      soundexCode: soundex(input),
    };
  }

  // Multiple matches - pick the one with smallest edit distance
  let bestMatch = phoneticMatches[0];
  let bestDistance = levenshteinDistance(input, phoneticMatches[0]);

  for (let i = 1; i < phoneticMatches.length; i++) {
    const distance = levenshteinDistance(input, phoneticMatches[i]);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = phoneticMatches[i];
    }
  }

  return {
    match: bestMatch,
    soundexCode: soundex(input),
  };
}

/**
 * Create a cached Soundex lookup for efficient repeated matching.
 * Pre-computes Soundex codes for all candidates.
 *
 * @param {string[]} candidates - Array of strings to pre-compute
 * @returns {Object} Object with lookup methods
 *
 * @example
 * const lookup = createSoundexCache(['chicken', 'turkey', 'beef', 'pork']);
 * lookup.find('chiken')  // → ['chicken']
 * lookup.find('turky')   // → ['turkey']
 * lookup.find('beaf')    // → ['beef']
 */
export function createSoundexCache(candidates) {
  // Build a map of soundex code → candidates
  const soundexMap = new Map();

  for (const candidate of candidates) {
    const code = soundex(candidate);
    if (!soundexMap.has(code)) {
      soundexMap.set(code, []);
    }
    soundexMap.get(code).push(candidate);
  }

  return {
    /**
     * Find all candidates matching the input's Soundex code
     * @param {string} input - String to match
     * @returns {string[]} Matching candidates
     */
    find(input) {
      const code = soundex(input);
      return soundexMap.get(code) || [];
    },

    /**
     * Get the Soundex code for a string
     * @param {string} input - String to encode
     * @returns {string} Soundex code
     */
    getCode(input) {
      return soundex(input);
    },

    /**
     * Get all unique Soundex codes in the cache
     * @returns {string[]} Array of Soundex codes
     */
    getCodes() {
      return Array.from(soundexMap.keys());
    },
  };
}

/*
 * ==================== UNIT TEST EXAMPLES ====================
 *
 * These examples demonstrate expected behavior and can be used
 * for testing the functions.
 *
 * LEVENSHTEIN DISTANCE TESTS:
 * ---------------------------
 * levenshteinDistance('', '')           === 0   // Empty strings
 * levenshteinDistance('a', '')          === 1   // One empty
 * levenshteinDistance('abc', 'abc')     === 0   // Identical
 * levenshteinDistance('brocolli', 'broccoli') === 1   // Common typo
 * levenshteinDistance('chiken', 'chicken')    === 1   // Missing letter
 * levenshteinDistance('tomatoe', 'tomato')    === 1   // Extra letter
 * levenshteinDistance('milk', 'pork')         === 3   // Different words
 * levenshteinDistance('kitten', 'sitting')    === 3   // Classic example
 * levenshteinDistance('MILK', 'milk')         === 0   // Case insensitive
 *
 * FIND CLOSEST MATCH TESTS:
 * -------------------------
 * findClosestMatch('brocolli', ['broccoli', 'cabbage'])
 *   === { match: 'broccoli', distance: 1 }
 *
 * findClosestMatch('chikn', ['chicken', 'turkey', 'beef'])
 *   === { match: 'chicken', distance: 2 }
 *
 * findClosestMatch('milk', ['pork', 'beef', 'lamb'])
 *   === null   // 'milk' → 'pork' is distance 3, exceeds threshold 1
 *
 * findClosestMatch('yogart', ['yogurt', 'cheese', 'butter'])
 *   === { match: 'yogurt', distance: 1 }
 *
 * SOUNDEX TESTS:
 * --------------
 * soundex('chicken')    === 'C250'
 * soundex('chiken')     === 'C250'   // Same as chicken
 * soundex('Robert')     === 'R163'
 * soundex('Rupert')     === 'R163'   // Same as Robert
 * soundex('Ashcraft')   === 'A261'
 * soundex('Ashcroft')   === 'A261'   // Same as Ashcraft
 * soundex('Tymczak')    === 'T522'
 * soundex('Pfister')    === 'P236'
 * soundex('')           === '0000'   // Empty string
 *
 * PHONETIC MATCH TESTS:
 * ---------------------
 * findPhoneticMatch('chiken', ['chicken', 'turkey'])
 *   === ['chicken']
 *
 * findPhoneticMatch('yogart', ['yogurt', 'milk', 'cheese'])
 *   === ['yogurt']
 *
 * findPhoneticMatch('xyz', ['chicken', 'beef'])
 *   === []   // No phonetic match
 *
 * CACHE TESTS:
 * ------------
 * const cache = createSoundexCache(['chicken', 'turkey', 'beef']);
 * cache.find('chiken')  === ['chicken']
 * cache.find('turky')   === ['turkey']
 * cache.getCode('beef') === 'B100'
 */
