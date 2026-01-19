/**
 * Food Emoji Mapping System
 *
 * Properly designed emoji resolution that integrates with the parser:
 *
 * Priority chain:
 * 1. Database key lookup (chicken_breast → 🍗) - Most accurate
 * 2. Compound phrases (ice cream → 🍦) - Prevents "ice" matching alone
 * 3. Single keywords (chicken → 🍗) - Longest first to prevent substring issues
 * 4. Category fallback (Meat → 🥩) - Always works
 * 5. Letter fallback (Turkey Dinner → "TD") - Last resort, still useful
 *
 * IMPORTANT: This module expects the parser to have already:
 * - Stripped brand names
 * - Expanded abbreviations
 * - Matched to database (providing dbKey)
 *
 * This eliminates duplicate abbreviation logic and ensures consistency.
 */

// =============================================================================
// DATABASE KEY → EMOJI MAP
// Direct mapping from shelfLifeDatabase keys to emojis
// This is the most accurate matching - parser already did the hard work
// =============================================================================

const dbKeyEmojis = {
  // Common entries (high traffic)
  milk: '🥛',
  eggs: '🥚',
  chicken_breast: '🍗',
  chicken: '🍗',
  broccoli: '🥦',
  spinach: '🥬',
  lettuce: '🥬',
  tomato: '🍅',
  potato: '🥔',
  onion: '🧅',
  banana: '🍌',
  apple: '🍎',
  strawberry: '🍓',
  yogurt: '🥛',
  cheese: '🧀',
  beef: '🥩',
  pork: '🥩',
  bacon: '🥓',
  bread: '🍞',
  orange_juice: '🧃',
  juice: '🧃',
  turkey: '🍗',
  turkey_breast: '🍗',
  peas: '🥬',
  frozen_peas: '🥬',
  frozen_vegetables: '🥬',
  cabbage: '🥬',
  avocado: '🥑',
  cucumber: '🥒',
  salsa: '🥫',
  greek_yogurt: '🥛',
  shredded_cheese: '🧀',
  mayo: '🥫',
  olive_oil: '🫒',
  sardines: '🐟',
  pita_bread: '🫓',
  feta_cheese: '🧀',
  tempeh: '🥬',
  paneer: '🧀',
  mac_and_cheese: '🧀',
  pbj: '🥜',
  ice_cream: '🍦',
  oat_milk: '🥛',
  blueberries: '🫐',
  raspberries: '🫐',
  cherries: '🍒',
  green_beans: '🥬',

  // Dairy
  butter: '🧈',
  buttermilk: '🥛',
  cream_cheese: '🧀',
  cottage_cheese: '🧀',
  sour_cream: '🥛',
  heavy_cream: '🥛',
  half_and_half: '🥛',
  whipped_cream: '🥛',

  // Meat
  ground_beef: '🥩',
  steak: '🥩',
  pork_chops: '🥩',
  ham: '🍖',
  sausage: '🌭',
  hot_dog: '🌭',
  salami: '🥓',
  prosciutto: '🥓',

  // Seafood
  salmon: '🍣',
  tuna: '🐟',
  shrimp: '🦐',
  crab: '🦀',
  lobster: '🦞',
  fish: '🐟',
  cod: '🐟',
  tilapia: '🐟',

  // Produce
  carrot: '🥕',
  celery: '🥬',
  mushroom: '🍄',
  bell_pepper: '🫑',
  garlic: '🧄',
  ginger: '🫚',
  corn: '🌽',
  asparagus: '🥬',

  // Fruits
  orange: '🍊',
  lemon: '🍋',
  lime: '🍋',
  grapes: '🍇',
  watermelon: '🍉',
  cantaloupe: '🍈',
  mango: '🥭',
  peach: '🍑',
  pear: '🍐',
  kiwi: '🥝',
  pineapple: '🍍',
  coconut: '🥥',

  // Prepared/Frozen
  pizza: '🍕',
  lasagna: '🍝',
  pasta: '🍝',
  soup: '🍲',
  burrito: '🌯',
  taco: '🌮',
  sandwich: '🥪',
  salad: '🥗',

  // Pantry
  peanut_butter: '🥜',
  honey: '🍯',
  jam: '🍯',
  jelly: '🍯',
  ketchup: '🥫',
  mustard: '🥫',
  mayonnaise: '🥫',
  soy_sauce: '🥫',
  hot_sauce: '🌶️',

  // Bakery
  bagel: '🥯',
  muffin: '🧁',
  croissant: '🥐',
  donut: '🍩',
  cake: '🎂',
  pie: '🥧',
  cookies: '🍪',
};

// =============================================================================
// COMPOUND PHRASES
// Checked before single keywords to prevent incorrect matches
// e.g., "orange juice" → 🧃 not 🍊
// =============================================================================

const compoundPhrases = {
  'orange juice': '🧃',
  'apple juice': '🧃',
  'grape juice': '🧃',
  'cranberry juice': '🧃',
  'ice cream': '🍦',
  'peanut butter': '🥜',
  'almond butter': '🥜',
  'cream cheese': '🧀',
  'cottage cheese': '🧀',
  'sour cream': '🥛',
  'whipped cream': '🥛',
  'hot dog': '🌭',
  'french fries': '🍟',
  'fried rice': '🍚',
  'fried chicken': '🍗',
  'grilled cheese': '🧀',
  'mac and cheese': '🧀',
  'macaroni and cheese': '🧀',
  'chicken salad': '🥗',
  'tuna salad': '🥗',
  'egg salad': '🥗',
  'fruit salad': '🥗',
  'potato salad': '🥗',
  'green beans': '🥬',
  'baked beans': '🥫',
  'string cheese': '🧀',
  'greek yogurt': '🥛',
  'ground beef': '🥩',
  'ground turkey': '🍗',
  'lunch meat': '🥩',
  'deli meat': '🥩',
  'olive oil': '🫒',
  'oat milk': '🥛',
  'almond milk': '🥛',
  'coconut milk': '🥥',
  'pita bread': '🫓',
  'feta cheese': '🧀',
};

// Pre-sort by length (longest first)
const sortedCompounds = Object.entries(compoundPhrases)
  .sort((a, b) => b[0].length - a[0].length);

// =============================================================================
// SINGLE KEYWORDS
// Sorted by length at runtime to prevent substring issues
// e.g., "pineapple" checked before "apple"
// =============================================================================

const foodKeywords = {
  // Fruits (longer words first in lookup)
  strawberry: '🍓',
  strawberries: '🍓',
  watermelon: '🍉',
  blueberry: '🫐',
  blueberries: '🫐',
  raspberry: '🫐',
  raspberries: '🫐',
  blackberry: '🫐',
  blackberries: '🫐',
  pineapple: '🍍',
  grapefruit: '🍊',
  cantaloupe: '🍈',
  honeydew: '🍈',
  tangerine: '🍊',
  clementine: '🍊',
  pomegranate: '🍎',
  coconut: '🥥',
  avocado: '🥑',
  banana: '🍌',
  orange: '🍊',
  tomato: '🍅',
  cherry: '🍒',
  cherries: '🍒',
  grapes: '🍇',
  grape: '🍇',
  lemon: '🍋',
  mango: '🥭',
  melon: '🍈',
  peach: '🍑',
  apple: '🍎',
  lime: '🍋',
  pear: '🍐',
  kiwi: '🥝',
  fig: '🍇',

  // Vegetables
  asparagus: '🥬',
  artichoke: '🥬',
  zucchini: '🥒',
  cucumber: '🥒',
  broccoli: '🥦',
  cauliflower: '🥦',
  eggplant: '🍆',
  mushroom: '🍄',
  mushrooms: '🍄',
  spinach: '🥬',
  cabbage: '🥬',
  lettuce: '🥬',
  celery: '🥬',
  cilantro: '🌿',
  parsley: '🌿',
  basil: '🌿',
  mint: '🌿',
  dill: '🌿',
  rosemary: '🌿',
  thyme: '🌿',
  oregano: '🌿',
  chives: '🌿',
  scallion: '🧅',
  carrot: '🥕',
  carrots: '🥕',
  potato: '🥔',
  potatoes: '🥔',
  pepper: '🫑',
  peppers: '🫑',
  jalapeno: '🌶️',
  onion: '🧅',
  onions: '🧅',
  garlic: '🧄',
  ginger: '🫚',
  corn: '🌽',
  peas: '🥬',
  kale: '🥬',
  beans: '🥬',

  // Meat & Protein
  prosciutto: '🥓',
  pepperoni: '🍕',
  sausage: '🌭',
  chicken: '🍗',
  turkey: '🍗',
  salami: '🥓',
  bacon: '🥓',
  steak: '🥩',
  roast: '🥩',
  pork: '🥩',
  beef: '🥩',
  lamb: '🥩',
  veal: '🥩',
  tofu: '🥬',
  tempeh: '🥬',
  meat: '🥩',
  deli: '🥩',
  ham: '🍖',
  ribs: '🍖',

  // Seafood
  lobster: '🦞',
  shrimp: '🦐',
  prawns: '🦐',
  salmon: '🍣',
  tuna: '🐟',
  fish: '🐟',
  crab: '🦀',
  cod: '🐟',

  // Eggs
  eggs: '🥚',
  egg: '🥚',
  omelet: '🥚',
  omelette: '🥚',

  // Dairy
  parmesan: '🧀',
  cheddar: '🧀',
  mozzarella: '🧀',
  cheese: '🧀',
  yogurt: '🥛',
  butter: '🧈',
  cream: '🥛',
  milk: '🥛',

  // Bread & Bakery
  croissant: '🥐',
  baguette: '🥖',
  pancakes: '🥞',
  pancake: '🥞',
  waffles: '🧇',
  waffle: '🧇',
  pretzel: '🥨',
  muffin: '🧁',
  cookie: '🍪',
  cookies: '🍪',
  bagel: '🥯',
  bread: '🍞',
  toast: '🍞',
  donut: '🍩',
  cake: '🎂',
  pie: '🥧',
  roll: '🍞',

  // Prepared Foods
  quesadilla: '🌮',
  enchilada: '🌯',
  burrito: '🌯',
  tortilla: '🫓',
  tortillas: '🫓',
  pita: '🫓',
  naan: '🫓',
  flatbread: '🫓',
  lasagna: '🍝',
  spaghetti: '🍝',
  sandwich: '🥪',
  hamburger: '🍔',
  cheeseburger: '🍔',
  pizza: '🍕',
  burger: '🍔',
  taco: '🌮',
  wrap: '🌯',
  sushi: '🍣',
  ramen: '🍜',
  noodle: '🍜',
  noodles: '🍜',
  pasta: '🍝',
  soup: '🍲',
  stew: '🍲',
  curry: '🍛',
  rice: '🍚',
  fries: '🍟',
  salad: '🥗',
  sub: '🥪',

  // Leftovers & Prepared
  leftover: '🍱',
  leftovers: '🍱',
  dinner: '🍽️',
  meal: '🍽️',
  prep: '🍱',

  // Drinks
  smoothie: '🥤',
  lemonade: '🍋',
  coffee: '☕',
  espresso: '☕',
  juice: '🧃',
  soda: '🥤',
  cola: '🥤',
  beer: '🍺',
  wine: '🍷',
  tea: '🍵',

  // Snacks & Condiments
  chocolate: '🍫',
  popcorn: '🍿',
  candy: '🍬',
  chips: '🥔',
  nuts: '🥜',
  hummus: '🥙',
  guacamole: '🥑',
  salsa: '🥫',
  dip: '🥣',
  honey: '🍯',
  sauce: '🥫',
  jam: '🍯',
  jelly: '🍯',
  ketchup: '🥫',
  mustard: '🥫',
  mayo: '🥫',
  mayonnaise: '🥫',

  // Frozen
  popsicle: '🍦',
  frozen: '🧊',
  ice: '🧊',
};

// Pre-sort keywords by length (longest first)
const sortedKeywords = Object.entries(foodKeywords)
  .sort((a, b) => b[0].length - a[0].length);

// =============================================================================
// CATEGORY FALLBACK EMOJIS
// Used when no specific keyword matches
// =============================================================================

const categoryEmojis = {
  Dairy: '🥛',
  Meat: '🥩',
  Vegetables: '🥬',
  Fruits: '🍎',
  Bakery: '🍞',
  Frozen: '🧊',
  Pantry: '🥫',
  Beverages: '🧃',
  Seafood: '🐟',
  Deli: '🥪',
  Other: '🍽️',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate letter-based fallback (first letters of each word)
 * @param {string} name - The item name
 * @returns {string} Letters like "TD" for "Turkey Dinner"
 */
function getLetterFallback(name) {
  if (!name) return '??';

  const words = name.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return '??';

  if (words.length === 1) {
    // Single word: return first 2 letters capitalized
    return words[0].substring(0, 2).toUpperCase();
  }

  // Multiple words: return first letter of each (up to 3)
  return words
    .slice(0, 3)
    .map(w => w.charAt(0).toUpperCase())
    .join('');
}

// =============================================================================
// MAIN EXPORT: getFoodEmoji
// =============================================================================

/**
 * Get an emoji for a food item
 *
 * Accepts either:
 * - Parsed result object: { name, category, dbKey }
 * - Simple call: (name, category)
 *
 * Priority:
 * 1. dbKey direct lookup (most accurate, parser already matched)
 * 2. Compound phrases (prevents "orange juice" → 🍊)
 * 3. Single keywords (longest first)
 * 4. Category fallback
 * 5. Letter fallback
 *
 * @param {string|object} nameOrParsed - Item name or parsed result object
 * @param {string} [category] - Category (if first arg is string)
 * @returns {string} Emoji or letter fallback
 */
export function getFoodEmoji(nameOrParsed, category) {
  // Handle both call styles
  let name, dbKey, cat;

  if (typeof nameOrParsed === 'object' && nameOrParsed !== null) {
    // New style: getFoodEmoji({ name, category, dbKey })
    name = nameOrParsed.name || '';
    cat = nameOrParsed.category;
    dbKey = nameOrParsed.dbKey || nameOrParsed.matchedKey;
  } else {
    // Old style: getFoodEmoji(name, category)
    name = nameOrParsed || '';
    cat = category;
    dbKey = null;
  }

  const lowerName = name.toLowerCase();

  // 1. Database key lookup (most accurate - parser already did matching)
  if (dbKey && dbKeyEmojis[dbKey]) {
    return dbKeyEmojis[dbKey];
  }

  // 2. Check compound phrases first
  for (const [phrase, emoji] of sortedCompounds) {
    if (lowerName.includes(phrase)) {
      return emoji;
    }
  }

  // 3. Check single keywords (longest first)
  for (const [keyword, emoji] of sortedKeywords) {
    if (lowerName.includes(keyword)) {
      return emoji;
    }
  }

  // 4. Category fallback
  if (cat && categoryEmojis[cat]) {
    return categoryEmojis[cat];
  }

  // 5. Letter fallback
  return getLetterFallback(name);
}

// =============================================================================
// ADDITIONAL EXPORTS
// =============================================================================

/**
 * Get a background color class based on category
 * @param {string} category - The item category
 * @returns {string} Tailwind CSS class
 */
export function getCategoryBgColor(category) {
  const colors = {
    Dairy: 'bg-sky-50',
    Meat: 'bg-rose-50',
    Vegetables: 'bg-green-50',
    Fruits: 'bg-orange-50',
    Bakery: 'bg-amber-50',
    Frozen: 'bg-cyan-50',
    Pantry: 'bg-stone-50',
    Beverages: 'bg-purple-50',
    Seafood: 'bg-blue-50',
    Deli: 'bg-pink-50',
    Other: 'bg-slate-50',
  };
  return colors[category] || 'bg-slate-50';
}

/**
 * Get category emoji only (for UI badges, etc.)
 * @param {string} category - The category name
 * @returns {string} Category emoji
 */
export function getCategoryEmoji(category) {
  return categoryEmojis[category] || '🍽️';
}

/**
 * Debug helper: Show emoji resolution chain
 * @param {string|object} nameOrParsed - Item name or parsed object
 * @param {string} [category] - Category
 * @returns {object} Debug info
 */
export function debugEmojiMatch(nameOrParsed, category) {
  let name, dbKey, cat;

  if (typeof nameOrParsed === 'object' && nameOrParsed !== null) {
    name = nameOrParsed.name || '';
    cat = nameOrParsed.category;
    dbKey = nameOrParsed.dbKey || nameOrParsed.matchedKey;
  } else {
    name = nameOrParsed || '';
    cat = category;
    dbKey = null;
  }

  const lowerName = name.toLowerCase();

  // Check each level
  if (dbKey && dbKeyEmojis[dbKey]) {
    return { emoji: dbKeyEmojis[dbKey], matchType: 'dbKey', matched: dbKey };
  }

  for (const [phrase, emoji] of sortedCompounds) {
    if (lowerName.includes(phrase)) {
      return { emoji, matchType: 'compound', matched: phrase };
    }
  }

  for (const [keyword, emoji] of sortedKeywords) {
    if (lowerName.includes(keyword)) {
      return { emoji, matchType: 'keyword', matched: keyword };
    }
  }

  if (cat && categoryEmojis[cat]) {
    return { emoji: categoryEmojis[cat], matchType: 'category', matched: cat };
  }

  const letters = getLetterFallback(name);
  return { emoji: letters, matchType: 'letters', matched: name };
}
