/**
 * Brand Names Database
 *
 * Comprehensive list of grocery brand names to strip from food inputs.
 * Used by the local parser to normalize food names for better matching.
 *
 * Categories:
 * - Store/Private Label brands
 * - Meat/Poultry brands
 * - Dairy brands
 * - Produce brands
 * - Frozen food brands
 * - Beverage brands
 */

// =============================================================================
// BRAND NAME DATABASE
// =============================================================================

/**
 * Store/Private Label Brands
 * These are grocery chain house brands
 */
const STORE_BRANDS = [
  // Kroger family
  'Kroger',
  'Private Selection',
  'Simple Truth',
  'Simple Truth Organic',

  // Walmart family
  'Great Value',
  'Marketside',
  "Sam's Choice",
  'Sams Choice',

  // Target family
  'Good & Gather',
  'Good and Gather',
  'Market Pantry',
  'Simply Balanced',

  // Costco
  'Kirkland Signature',
  'Kirkland',

  // Trader Joe's
  "Trader Joe's",
  'Trader Joes',

  // Whole Foods / Amazon
  '365',
  '365 Whole Foods',
  '365 Organic',
  'Amazon Fresh',
  'Whole Foods',

  // Safeway/Albertsons family
  'Signature Select',
  'O Organics',
  'Open Nature',
  'Safeway',
  'Albertsons',

  // Regional grocers
  'Publix',
  'Publix Premium',
  'Wegmans',
  'H-E-B',
  'HEB',
  'Meijer',
  'Meijer Organics',

  // Discount grocers
  'Aldi',
  'Lidl',
  'Sprouts',
  'Natural Grocers',

  // Other store brands
  'Stop & Shop',
  'Stop and Shop',
  'Giant',
  'Food Lion',
  'Harris Teeter',
  'ShopRite',
  'Hy-Vee',
];

/**
 * Meat and Poultry Brands
 */
const MEAT_BRANDS = [
  // Chicken/Poultry
  'Tyson',
  'Perdue',
  'Foster Farms',
  "Pilgrim's",
  'Pilgrims',
  'Pilgrim Pride',
  'Bell & Evans',
  'Bell and Evans',
  'Sanderson Farms',

  // Turkey
  'Butterball',
  'Jennie-O',
  'Jennie O',
  'JennieO',
  'Honeysuckle White',
  'Shady Brook Farms',

  // Processed meats
  'Oscar Mayer',
  'Hillshire Farm',
  'Jimmy Dean',
  'Johnsonville',
  'Eckrich',
  'Bar-S',
  'Bar S',

  // Pork/Ham
  'Hormel',
  'Smithfield',
  'Farmland',
  'Hatfield',
  'Niman Ranch',

  // Deli meats
  "Boar's Head",
  'Boars Head',
  'Dietz & Watson',
  'Dietz and Watson',
  'Applegate',
  'Applegate Farms',
  'Columbus',
  'Volpi',

  // Hot dogs/Sausages
  'Hebrew National',
  "Nathan's",
  'Nathans',
  'Ball Park',
  'Ballpark',
  'Kayem',

  // Beef
  'Angus',
  'Certified Angus Beef',
  'CAB',
  'Black Angus',
  'Laura\'s Lean',
  'Lauras Lean',
];

/**
 * Dairy Brands
 */
const DAIRY_BRANDS = [
  // Organic milk
  'Horizon',
  'Horizon Organic',
  'Organic Valley',
  'Stonyfield',
  'Stonyfield Farm',

  // Yogurt
  'Chobani',
  'Fage',
  'FAGE',
  'Dannon',
  'Yoplait',
  'Oikos',
  'Siggi\'s',
  'Siggis',
  'Noosa',
  'Brown Cow',
  'Wallaby',
  'Greek Gods',

  // Cheese
  'Tillamook',
  'Cabot',
  'Kraft',
  'Sargento',
  'Borden',
  'Belgioioso',
  'BelGioioso',
  'Président',
  'President',
  'Laughing Cow',
  'Babybel',

  // Cream cheese/Butter
  'Philadelphia',
  "Land O'Lakes",
  'Land O Lakes',
  'Land O\'Lakes',
  'Challenge',
  'Kerrygold',
  'Plugrá',
  'Plugra',

  // Specialty dairy
  'Lactaid',
  'Fairlife',
  'A2',

  // Plant-based milk alternatives
  'Silk',
  'Almond Breeze',
  'Blue Diamond',
  'Oatly',
  'Califia Farms',
  'Califia',
  'Planet Oat',
  'Ripple',
  'So Delicious',
  'Elmhurst',
  'Malk',
  'Milkadamia',
  'Minor Figures',
];

/**
 * Produce Brands
 */
const PRODUCE_BRANDS = [
  // Fruit brands
  'Dole',
  'Chiquita',
  'Del Monte',
  'Sunkist',
  'Cuties',
  'Halos',
  'Wonderful',

  // Berry brands
  "Driscoll's",
  'Driscolls',
  'Naturipe',
  'Wish Farms',
  'California Giant',

  // Organic/Packaged produce
  'Earthbound Farm',
  'Earthbound',
  'Organic Girl',
  'Olivia\'s',
  'Olivias',

  // Salad/Prepared produce
  'Ready Pac',
  'Taylor Farms',
  'Fresh Express',
  'Dole Fresh',
  'Bolthouse Farms',
  'Bolthouse',
  'Mann\'s',
  'Manns',
  'Green Giant Fresh',
];

/**
 * Frozen Food Brands
 */
const FROZEN_BRANDS = [
  // Frozen vegetables
  'Birds Eye',
  'Green Giant',
  'Pictsweet',
  'Cascadian Farm',

  // Frozen meals
  "Stouffer's",
  'Stouffers',
  'Lean Cuisine',
  'Healthy Choice',
  "Marie Callender's",
  'Marie Callenders',
  'Boston Market',
  'Banquet',
  'Hungry-Man',
  'Hungry Man',
  'Smart Ones',
  'Devour',

  // Natural/Organic frozen
  "Amy's",
  'Amys',
  'Kashi',
  'Evol',
  'Sweet Earth',
  'Dr. Praeger\'s',
  'Dr Praegers',

  // Frozen breakfast
  'Eggo',
  "Aunt Jemima",
  'Aunt Jemima',

  // Ice cream (for completeness)
  "Ben & Jerry's",
  'Ben and Jerrys',
  'Häagen-Dazs',
  'Haagen Dazs',
  "Breyer's",
  'Breyers',
  'Talenti',
  'Halo Top',
];

/**
 * Beverage Brands
 */
const BEVERAGE_BRANDS = [
  // Juice
  'Tropicana',
  'Minute Maid',
  // 'Simply Orange' removed - "Orange" is product descriptor, not brand
  'Simply',
  'Florida\'s Natural',
  'Floridas Natural',
  'Naked Juice',
  'Naked',
  'Odwalla',
  'Evolution Fresh',
  'Suja',
  'Pressed Juicery',

  // Cranberry/Grape
  'Ocean Spray',
  "Welch's",
  'Welchs',
  'Langers',
  'Lakewood',

  // Other beverages
  'Califia',
  'KeVita',
  'GT\'s',
  'GTs',
  'Health-Ade',
  'Health Ade',
];

// =============================================================================
// COMBINED EXPORT
// =============================================================================

/**
 * Complete array of all brand names
 * Sorted by length (longest first) for proper matching
 */
export const BRAND_NAMES = [
  ...STORE_BRANDS,
  ...MEAT_BRANDS,
  ...DAIRY_BRANDS,
  ...PRODUCE_BRANDS,
  ...FROZEN_BRANDS,
  ...BEVERAGE_BRANDS,
].sort((a, b) => b.length - a.length);

// =============================================================================
// STRIP BRANDS FUNCTION
// =============================================================================

/**
 * Strips brand names from a food input string
 *
 * Features:
 * - Case-insensitive matching
 * - Handles multi-word brands (e.g., "Great Value", "Trader Joe's")
 * - Handles possessives (e.g., "Driscoll's" → removes)
 * - Preserves the rest of the food name
 * - Cleans up extra whitespace
 *
 * @param {string} input - The raw food input (e.g., "Tyson chicken breast")
 * @returns {string} - The cleaned food name (e.g., "chicken breast")
 *
 * @example
 * stripBrands("Tyson chicken breast") // → "chicken breast"
 * stripBrands("Great Value 2% milk") // → "2% milk"
 * stripBrands("Driscoll's strawberries") // → "strawberries"
 * stripBrands("Kirkland Signature organic eggs") // → "organic eggs"
 */
export function stripBrands(input) {
  if (!input || typeof input !== 'string') {
    return input || '';
  }

  let result = input.trim();

  // Iterate through all brand names (already sorted longest-first)
  for (const brand of BRAND_NAMES) {
    // Create regex pattern for case-insensitive matching
    // Escape special regex characters in brand name
    const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Match brand name with optional possessive ('s) and word boundary
    // \b ensures we match whole words, not substrings
    const pattern = new RegExp(
      `\\b${escapedBrand}(?:'s|'s)?\\b`,
      'gi'
    );

    result = result.replace(pattern, '');
  }

  // Clean up the result
  result = result
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    // Remove leading/trailing whitespace
    .trim()
    // Remove leading/trailing punctuation that might be left over
    .replace(/^[,\-–—]\s*/, '')
    .replace(/\s*[,\-–—]$/, '');

  return result;
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

/**
 * Check if a string contains any known brand name
 *
 * @param {string} input - The string to check
 * @returns {boolean} - True if a brand is found
 */
export function containsBrand(input) {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const lowerInput = input.toLowerCase();

  for (const brand of BRAND_NAMES) {
    const lowerBrand = brand.toLowerCase();
    if (lowerInput.includes(lowerBrand)) {
      return true;
    }
  }

  return false;
}

/**
 * Extract the brand name from a food input
 *
 * @param {string} input - The food input string
 * @returns {string|null} - The matched brand name or null
 */
export function extractBrand(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const lowerInput = input.toLowerCase();

  for (const brand of BRAND_NAMES) {
    const lowerBrand = brand.toLowerCase();
    // Check for brand with word boundary
    const pattern = new RegExp(
      `\\b${lowerBrand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:'s|'s)?\\b`,
      'i'
    );
    if (pattern.test(input)) {
      return brand;
    }
  }

  return null;
}

// =============================================================================
// CATEGORY EXPORTS (for reference/debugging)
// =============================================================================

export const BRAND_CATEGORIES = {
  STORE_BRANDS,
  MEAT_BRANDS,
  DAIRY_BRANDS,
  PRODUCE_BRANDS,
  FROZEN_BRANDS,
  BEVERAGE_BRANDS,
};
