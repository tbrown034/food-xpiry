/**
 * Abbreviations Dictionary for Food/Grocery Items
 *
 * This module provides comprehensive abbreviation expansion for grocery receipts
 * and food items. Common receipt scanners and POS systems use abbreviated names
 * that need to be expanded for better user experience and database matching.
 *
 * @module abbreviations
 */

/**
 * Master dictionary mapping abbreviations to their full word equivalents.
 * All keys are lowercase for case-insensitive matching.
 * @type {Object.<string, string>}
 */
export const ABBREVIATIONS = {
  // ============================================
  // MEAT ABBREVIATIONS
  // ============================================
  chkn: 'chicken',
  chk: 'chicken',
  bf: 'beef',
  beef: 'beef',
  prk: 'pork',
  trky: 'turkey',
  tky: 'turkey',
  brst: 'breast',
  thgh: 'thigh',
  grnd: 'ground',
  grd: 'ground',
  bnls: 'boneless',
  sknls: 'skinless',
  cutlt: 'cutlet',
  rstd: 'roasted',
  rotis: 'rotisserie',

  // ============================================
  // DAIRY ABBREVIATIONS
  // ============================================
  mlk: 'milk',
  chz: 'cheese',
  chse: 'cheese',
  yog: 'yogurt',
  ygrt: 'yogurt',
  bttr: 'butter',
  egg: 'eggs',
  egs: 'eggs',
  crm: 'cream',
  shrd: 'shredded',
  slcd: 'sliced',

  // ============================================
  // PRODUCE ABBREVIATIONS
  // ============================================
  broc: 'broccoli',
  tom: 'tomato',
  tmto: 'tomato',
  pot: 'potato',
  let: 'lettuce',
  lett: 'lettuce',
  spin: 'spinach',
  cuke: 'cucumber',
  oni: 'onion',
  onin: 'onion',
  grlc: 'garlic',
  bns: 'beans',
  grn: 'green',
  strw: 'strawberry',
  blueb: 'blueberry',
  blub: 'blueberry',
  rasp: 'raspberry',
  ban: 'banana',
  apl: 'apple',
  org: 'organic', // Note: Also used as modifier, context determines meaning
  orng: 'orange',

  // ============================================
  // MODIFIERS
  // ============================================
  // org: 'organic', // Already defined above
  frz: 'frozen',
  frzn: 'frozen',
  frsh: 'fresh',
  lg: 'large',
  sm: 'small',
  med: 'medium',
  whl: 'whole',
  ff: 'fat free',
  lf: 'low fat',
  rf: 'reduced fat',

  // ============================================
  // UNITS (for context awareness)
  // ============================================
  lb: 'pounds',
  lbs: 'pounds',
  oz: 'ounces',
  gal: 'gallon',
  doz: 'dozen',
  pk: 'pack',
  pkg: 'pack',
  ct: 'count',
  bg: 'bag',
  bn: 'bunch',

  // ============================================
  // COMMON RECEIPT PATTERNS
  // ============================================
  oj: 'orange juice',
  pb: 'peanut butter',
  evoo: 'extra virgin olive oil',
  mac: 'macaroni',
  spag: 'spaghetti',
};

/**
 * Expands abbreviations in a given input string.
 *
 * This function performs case-insensitive whole-word matching to expand
 * common grocery/food abbreviations found on receipts and POS systems.
 *
 * @param {string} input - The input string potentially containing abbreviations
 * @returns {string} The input with all recognized abbreviations expanded
 *
 * @example
 * expandAbbreviations("CHKN BRST 2LB")
 * // Returns: "chicken breast 2LB"
 *
 * @example
 * expandAbbreviations("ORG MLK GAL")
 * // Returns: "organic milk GAL"
 *
 * @example
 * expandAbbreviations("SHRD CHZ 8OZ")
 * // Returns: "shredded cheese 8OZ"
 *
 * @example
 * expandAbbreviations("FRZ BROC")
 * // Returns: "frozen broccoli"
 */
export function expandAbbreviations(input) {
  // Return original if input is empty or not a string
  if (!input || typeof input !== 'string') {
    return input || '';
  }

  // Split input into words while preserving original spacing
  // This regex captures both words and whitespace/punctuation
  const parts = input.split(/(\s+)/);

  const expandedParts = parts.map((part) => {
    // Skip whitespace parts
    if (/^\s+$/.test(part)) {
      return part;
    }

    // Check if this word (case-insensitive) is an abbreviation
    const lowerPart = part.toLowerCase();

    // Handle words that might have numbers/units attached (e.g., "2LB", "8OZ")
    // We want to match "LB" in "2LB" but as a whole word context
    // For this implementation, we only expand standalone words

    if (ABBREVIATIONS.hasOwnProperty(lowerPart)) {
      // Preserve the case pattern if the original was all uppercase
      const expansion = ABBREVIATIONS[lowerPart];

      // If original was all uppercase, keep expansion lowercase (more readable)
      // This is a design choice - receipts are often ALL CAPS but we want
      // readable output like "chicken breast" not "CHICKEN BREAST"
      return expansion;
    }

    // Return original part if no abbreviation match
    return part;
  });

  return expandedParts.join('');
}

/**
 * Checks if a word is a known abbreviation.
 *
 * @param {string} word - The word to check
 * @returns {boolean} True if the word is a known abbreviation
 *
 * @example
 * isAbbreviation("CHKN") // Returns: true
 * isAbbreviation("chicken") // Returns: false
 */
export function isAbbreviation(word) {
  if (!word || typeof word !== 'string') {
    return false;
  }
  return ABBREVIATIONS.hasOwnProperty(word.toLowerCase());
}

/**
 * Gets the expansion for a single abbreviation.
 *
 * @param {string} abbrev - The abbreviation to expand
 * @returns {string|null} The expanded form, or null if not found
 *
 * @example
 * getExpansion("CHKN") // Returns: "chicken"
 * getExpansion("unknown") // Returns: null
 */
export function getExpansion(abbrev) {
  if (!abbrev || typeof abbrev !== 'string') {
    return null;
  }
  const lower = abbrev.toLowerCase();
  return ABBREVIATIONS.hasOwnProperty(lower) ? ABBREVIATIONS[lower] : null;
}

/**
 * Returns all abbreviations for a given expanded word.
 * Useful for reverse lookups and understanding what abbreviations
 * map to a specific word.
 *
 * @param {string} word - The full word to find abbreviations for
 * @returns {string[]} Array of abbreviations that map to this word
 *
 * @example
 * getAbbreviationsFor("chicken") // Returns: ["chkn", "chk"]
 * getAbbreviationsFor("cheese") // Returns: ["chz", "chse"]
 */
export function getAbbreviationsFor(word) {
  if (!word || typeof word !== 'string') {
    return [];
  }
  const lowerWord = word.toLowerCase();
  return Object.entries(ABBREVIATIONS)
    .filter(([, expansion]) => expansion.toLowerCase() === lowerWord)
    .map(([abbrev]) => abbrev);
}

export default {
  ABBREVIATIONS,
  expandAbbreviations,
  isAbbreviation,
  getExpansion,
  getAbbreviationsFor,
};
