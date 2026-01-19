/**
 * Local Item Parser
 *
 * Robust local parsing pipeline:
 * 1. Normalize input (trim, lowercase for matching)
 * 2. Strip brand names (Tyson, Great Value, etc.)
 * 3. Expand abbreviations (CHKN → chicken)
 * 4. Parse quantity (2 lbs → quantity: 2, unit: lbs)
 * 5. Parse modifiers (organic, fresh, frozen)
 * 6. Database lookup with keyword matching
 * 7. Fuzzy match for typos (brocolli → broccoli)
 * 8. AI fallback only when everything else fails
 */

import { lookupShelfLife, inferCategory, DEFAULT_SHELF_LIFE, CATEGORIES, SHELF_LIFE_DATABASE } from './shelfLifeDatabase';
import { stripBrands, extractBrand } from './brandNames';
import { expandAbbreviations } from './abbreviations';
import { findClosestMatch, findBestPhoneticMatch, levenshteinDistance } from './fuzzyMatch';
import { assignStorageLocation } from './storageLocationAssigner';
import { StorageLocation } from './types';

/**
 * Parse quantity from item string
 * "2 lbs chicken" → { quantity: 2, unit: 'lbs', remaining: 'chicken' }
 * "dozen eggs" → { quantity: 12, unit: 'dozen', remaining: 'eggs' }
 */
function parseQuantity(input) {
  const normalized = input.trim();

  // Common quantity patterns
  const patterns = [
    // "2 lbs chicken", "3 oz beef"
    /^(\d+(?:\.\d+)?)\s*(lbs?|oz|kg|g|gallons?|gal|liters?|l|qt|pint|dozen|doz|pack|pk|ct|count|bunch|head|bag)\s+(.+)$/i,
    // "dozen eggs", "half gallon milk"
    /^(a\s+)?(dozen|doz|half\s+gallon|half\s+dozen)\s+(.+)$/i,
    // "2 chicken breasts"
    /^(\d+)\s+(.+)$/,
  ];

  // Try each pattern
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      let quantity = 1;
      let unit = '';
      let remaining = '';

      if (pattern === patterns[0]) {
        quantity = parseFloat(match[1]);
        unit = match[2].toLowerCase();
        remaining = match[3];
      } else if (pattern === patterns[1]) {
        const qtyWord = match[2].toLowerCase();
        if (qtyWord.includes('dozen')) {
          quantity = qtyWord.includes('half') ? 6 : 12;
        } else if (qtyWord.includes('half gallon')) {
          quantity = 0.5;
          unit = 'gallon';
        }
        remaining = match[3];
      } else {
        quantity = parseInt(match[1]);
        remaining = match[2];
      }

      return { quantity, unit, remaining: remaining.trim() };
    }
  }

  return { quantity: 1, unit: '', remaining: normalized };
}

/**
 * Parse modifier from item string
 * "organic chicken breast" → { modifier: 'organic', remaining: 'chicken breast' }
 * "boneless skinless chicken thighs" → { modifier: 'boneless skinless', remaining: 'chicken thighs' }
 */
function parseModifier(input) {
  const modifierWords = [
    'organic', 'fresh', 'frozen', 'raw', 'cooked', 'leftover',
    'boneless', 'skinless', 'bone-in', 'skin-on',
    'whole', 'sliced', 'diced', 'chopped', 'minced', 'ground',
    'large', 'small', 'medium', 'extra large', 'jumbo',
    'fat-free', 'low-fat', 'reduced fat', 'whole', 'skim', '2%', '1%',
    'grass-fed', 'free-range', 'cage-free', 'pasture-raised',
    'wild-caught', 'farm-raised',
    'ripe', 'unripe',
  ];

  const words = input.toLowerCase().split(/\s+/);
  const modifiers = [];
  const remaining = [];

  for (const word of words) {
    // Use exact match, not substring (otherwise "strawberry" matches "raw")
    if (modifierWords.some(m => word === m.toLowerCase())) {
      modifiers.push(word);
    } else {
      remaining.push(word);
    }
  }

  return {
    modifier: modifiers.join(' '),
    remaining: remaining.join(' ')
  };
}

/**
 * Detect food type from item string
 */
function detectFoodType(input) {
  const lower = input.toLowerCase();

  if (lower.includes('leftover') || lower.includes('cooked') || lower.includes('homemade')) {
    return 'leftover';
  }

  if (lower.includes('rotisserie') || lower.includes('deli') || lower.includes('prepared') || lower.includes('ready-to-eat')) {
    return 'premade';
  }

  return 'store-bought';
}

/**
 * Capitalize first letter of each word
 * Handles accented characters and preserves internal capitals
 */
function titleCase(str) {
  if (!str) return '';
  // First lowercase everything, then capitalize first letter of each word
  return str.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
}

/**
 * Get all database keys for fuzzy matching
 * Cached for performance
 */
let _dbKeysCache = null;
function getDatabaseKeys() {
  if (!_dbKeysCache) {
    _dbKeysCache = Object.keys(SHELF_LIFE_DATABASE);
  }
  return _dbKeysCache;
}

/**
 * Try fuzzy matching against the database
 * Uses Levenshtein distance and Soundex for phonetic matching
 *
 * @param {string} input - The normalized food name to match
 * @returns {{ found: boolean, matchedKey: string|null, confidence: string }}
 */
function fuzzyMatchDatabase(input) {
  const dbKeys = getDatabaseKeys();

  // Try Levenshtein distance first (catches typos)
  const levenshteinMatch = findClosestMatch(input, dbKeys);
  if (levenshteinMatch && levenshteinMatch.distance <= 2) {
    return {
      found: true,
      matchedKey: levenshteinMatch.match,
      confidence: levenshteinMatch.distance <= 1 ? 'high' : 'medium',
      matchType: 'levenshtein',
    };
  }

  // Try phonetic matching (catches different spellings of same sound)
  const phoneticMatch = findBestPhoneticMatch(input, dbKeys);
  if (phoneticMatch) {
    return {
      found: true,
      matchedKey: phoneticMatch.match,
      confidence: 'medium',
      matchType: 'phonetic',
    };
  }

  return { found: false, matchedKey: null, confidence: 'low' };
}

/**
 * Parse a single item string into structured data
 *
 * @param {string} input - Raw item string like "2 lbs organic chicken breast" or "TYSON CHKN BRST"
 * @returns {{ parsed: object, confidence: 'high'|'medium'|'low', needsAI: boolean }}
 */
export function parseItem(input) {
  if (!input || typeof input !== 'string') {
    return { parsed: null, confidence: 'low', needsAI: true };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { parsed: null, confidence: 'low', needsAI: true };
  }

  // Step 0: Normalize special characters
  // - Handle special compound abbreviations first (pb&j → pbj)
  // - Replace & with "and" for other cases
  // - Remove parentheses but keep content (chicken (boneless) → chicken boneless)
  // - Normalize multiple spaces
  const normalized = trimmed
    .replace(/\bpb\s*[&]\s*j\b/gi, 'pbj')  // pb&j → pbj (before & becomes "and")
    .replace(/&/g, ' and ')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Step 1: Strip brand names (Tyson, Great Value, Kirkland, etc.)
  const brandStripped = stripBrands(normalized);

  // Step 2: Expand abbreviations (CHKN → chicken, MLK → milk)
  const expanded = expandAbbreviations(brandStripped);

  // Step 3: Parse quantity
  const { quantity, unit, remaining: afterQuantity } = parseQuantity(expanded);

  // Step 4: Parse modifiers
  const { modifier, remaining: coreName } = parseModifier(afterQuantity);

  // Step 5: Detect food type
  const foodType = detectFoodType(trimmed); // Use original for context

  // Step 6: Look up shelf life in database
  let lookup = lookupShelfLife(coreName);

  // Step 7: If not found, try fuzzy matching
  if (!lookup.found && coreName.length >= 3) {
    const fuzzyResult = fuzzyMatchDatabase(coreName);
    if (fuzzyResult.found) {
      // Re-lookup with the matched key
      lookup = lookupShelfLife(fuzzyResult.matchedKey);
      lookup.matchedKey = fuzzyResult.matchedKey;
      lookup.matchType = fuzzyResult.matchType;
      // Adjust confidence based on fuzzy match quality
      if (lookup.found) {
        lookup.confidence = fuzzyResult.confidence;
      }
    }
  }

  // Step 8: Build result - preserve user's original name, only correct obvious misspellings
  // We want: "salmon" → "Salmon" (not "Fish"), "potatos" → "Potatoes" (corrected misspelling)
  let displayName = titleCase(coreName);
  if (lookup.found && lookup.matchedKey) {
    // Convert database key to compare
    const cleanKey = lookup.matchedKey.replace(/_raw$|_cooked$/, '').replace(/_/g, ' ');
    const normalizedInput = coreName.toLowerCase().trim();
    const normalizedKey = cleanKey.toLowerCase();

    // Check if this is likely a misspelling (similar to database key)
    // vs a specific variant (completely different word like "salmon" vs "fish")
    const isSimilar = (a, b) => {
      if (a === b) return true;
      if (a.length < 3 || b.length < 3) return a === b;

      // If one contains the other (e.g., "potato" in "potatoes")
      if (a.includes(b) || b.includes(a)) return true;

      // Use Levenshtein distance for better misspelling detection
      // Import is at top of file
      const distance = levenshteinDistance(a, b);
      const maxLen = Math.max(a.length, b.length);

      // Allow correction if edit distance is small relative to word length
      // Short words (<=5): allow 1 edit
      // Medium words (6-8): allow 2 edits
      // Long words (9+): allow 3 edits
      const threshold = maxLen <= 5 ? 1 : maxLen <= 8 ? 2 : 3;
      return distance <= threshold;
    };

    // Only use database key (corrected spelling) if it's similar to user input
    if (isSimilar(normalizedInput, normalizedKey)) {
      displayName = titleCase(cleanKey);
    }
    // Otherwise preserve user's specific name (e.g., "Salmon" not "Fish")
  }

  // Build final display name - include modifier if present
  // "organic chicken breast" → "Organic Chicken Breast"
  // "chicken" → "Chicken"
  const finalName = modifier
    ? `${titleCase(modifier)} ${displayName}`
    : displayName;

  const category = lookup.found ? lookup.data.category : inferCategory(coreName);

  const result = {
    name: finalName,
    modifier: modifier ? titleCase(modifier) : '',
    quantity,
    unit,
    foodType,
    category,
    shelfLifeDays: lookup.found ? lookup.data.days : null,
    source: lookup.found ? lookup.data.source : null,
    // dateType: 'safety' for high-risk foods, 'quality' for all others
    dateType: lookup.found ? (lookup.data.dateType || 'quality') : 'quality',
    // Include matchedKey for emoji lookup (database key from direct or fuzzy match)
    matchedKey: lookup.matchedKey || null,
    // Auto-assign storage location based on item type
    storageLocation: assignStorageLocation({ name: finalName, category, modifier }),
  };

  // Adjust shelf life for leftovers - always safety dates per FDA guidelines
  if (foodType === 'leftover' || foodType === 'premade') {
    result.shelfLifeDays = Math.min(result.shelfLifeDays || 4, 4);
    result.source = 'FDA';
    result.dateType = 'safety'; // Leftovers are always safety dates
  }

  // Adjust shelf life for frozen items
  // If modifier contains "frozen", extend shelf life significantly
  const isFrozen = modifier.toLowerCase().includes('frozen') ||
                   coreName.toLowerCase().includes('frozen');
  if (isFrozen && result.shelfLifeDays < 180) {
    // Frozen foods last much longer - use 365 days as default
    result.shelfLifeDays = 365;
    result.category = 'Frozen';
    result.source = 'USDA (frozen)';
    result.storageLocation = StorageLocation.FREEZER;
  }

  // Determine confidence
  let confidence = lookup.confidence;
  let needsAI = false;

  if (!lookup.found) {
    // If we couldn't find in database, we might need AI
    confidence = 'low';
    needsAI = true;
    // Set default shelf life based on category
    result.shelfLifeDays = DEFAULT_SHELF_LIFE[result.category] || 7;
    result.source = 'USDA Food Safety Guidelines';
  }

  return { parsed: result, confidence, needsAI };
}

/**
 * Parse multiple items from a comma/newline separated string or array
 *
 * @param {string|string[]} input - Raw input
 * @returns {{ items: object[], needsAI: string[], allLocal: boolean }}
 */
export function parseItems(input) {
  // Normalize input to array
  let items;
  if (Array.isArray(input)) {
    items = input;
  } else if (typeof input === 'string') {
    // Split by newline or comma
    items = input.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
  } else {
    return { items: [], needsAI: [], allLocal: true };
  }

  const parsedItems = [];
  const needsAI = [];

  for (const item of items) {
    const { parsed, needsAI: itemNeedsAI } = parseItem(item);

    if (parsed) {
      parsedItems.push(parsed);

      if (itemNeedsAI) {
        needsAI.push(item);
      }
    }
  }

  return {
    items: parsedItems,
    needsAI,
    allLocal: needsAI.length === 0
  };
}

/**
 * Calculate expiry date from shelf life days
 */
export function calculateExpiryDate(shelfLifeDays, purchaseDate = new Date()) {
  const expiry = new Date(purchaseDate);
  expiry.setDate(expiry.getDate() + shelfLifeDays);
  return expiry.toISOString().split('T')[0];
}

/**
 * Process items with full expiry calculation
 *
 * @param {object[]} items - Parsed items from parseItems()
 * @returns {object[]} - Items with expiryDate, daysUntilExpiry, status
 */
export function processItems(items) {
  const today = new Date().toISOString().split('T')[0];

  return items.map(item => {
    const expiryDate = calculateExpiryDate(item.shelfLifeDays);
    const daysUntilExpiry = item.shelfLifeDays;

    return {
      ...item,
      purchaseDate: today,
      expiryDate,
      daysUntilExpiry,
      status: daysUntilExpiry <= 3 ? 'expiring_soon' : 'fresh',
      isPerishable: true,
    };
  });
}
