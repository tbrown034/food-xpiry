/**
 * Storage Location Auto-Assignment
 *
 * Determines optimal storage location (fridge/freezer/pantry) for food items
 * Priority: USDA data > Keywords > Category > Default (fridge)
 */

import { Category, StorageLocation } from './types';

// Category to default storage location mapping
const CATEGORY_STORAGE_MAP = {
  [Category.FROZEN]: StorageLocation.FREEZER,
  [Category.PANTRY]: StorageLocation.PANTRY,
  [Category.BEVERAGES]: StorageLocation.FRIDGE,
  [Category.DAIRY]: StorageLocation.FRIDGE,
  [Category.MEAT]: StorageLocation.FRIDGE,
  [Category.VEGETABLES]: StorageLocation.FRIDGE,
  [Category.FRUITS]: StorageLocation.FRIDGE,
  [Category.BAKERY]: StorageLocation.PANTRY,
  [Category.OTHER]: StorageLocation.FRIDGE,
};

// Known freezer items by keyword or brand
const FREEZER_KEYWORDS = [
  'frozen', 'ice cream', 'icecream', 'gelato', 'sorbet', 'popsicle',
  'digiorno', 'digorno', 'hot pocket', 'hot pockets', 'lean cuisine',
  'stouffers', 'stouffer', 'marie callender', 'hungry man',
  'tv dinner', 'pizza rolls', 'bagel bites', 'totino',
  'frozen vegetables', 'frozen veggies', 'frozen fruit',
  'frozen pizza', 'frozen waffles', 'frozen breakfast',
  'ice pop', 'freezer', 'eggo', 'birds eye', 'birdseye',
  'ore-ida', 'oreida', 'tater tots', 'fish sticks',
  'frozen fish', 'frozen shrimp', 'frozen chicken',
  'frozen burger', 'frozen patties', 'frozen meat',
  'cool whip', 'coolwhip', 'frozen pie', 'frozen dessert',
  // Common frozen meal types (brands often stripped)
  'lasagna', 'pot pie', 'pot pies', 'corn dog', 'corn dogs',
  'chicken nugget', 'chicken nuggets', 'chicken tender', 'chicken tenders',
  'mozzarella stick', 'mozzarella sticks', 'jalapeno popper', 'jalapeno poppers'
];

// Known pantry items by keyword
const PANTRY_KEYWORDS = [
  'canned', 'can of', 'jarred', 'jar of', 'dried', 'dry',
  'pasta', 'spaghetti', 'penne', 'macaroni', 'noodles', 'ramen',
  'rice', 'quinoa', 'couscous', 'barley', 'oats', 'oatmeal',
  'cereal', 'cheerios', 'frosted flakes', 'corn flakes', 'granola',
  'crackers', 'chips', 'pretzels', 'popcorn', 'tortilla chips',
  'nuts', 'almonds', 'peanuts', 'cashews', 'walnuts', 'trail mix',
  'flour', 'sugar', 'brown sugar', 'powdered sugar', 'baking',
  'oil', 'olive oil', 'vegetable oil', 'cooking oil', 'canola',
  'vinegar', 'balsamic', 'apple cider vinegar',
  'spices', 'seasoning', 'salt', 'pepper', 'oregano', 'basil', 'cumin',
  'beans', 'lentils', 'chickpeas', 'black beans', 'kidney beans',
  'peanut butter', 'almond butter', 'nutella', 'jelly', 'jam',
  'honey', 'maple syrup', 'syrup', 'molasses',
  'sauce', 'tomato sauce', 'pasta sauce', 'marinara', 'alfredo',
  'broth', 'stock', 'bouillon',
  'coco puffs', 'cocoa puffs', 'fruit loops', 'froot loops',
  'corn', 'canned corn', 'canned beans', 'canned tomatoes',
  'tuna', 'canned tuna', 'sardines', 'canned salmon',
  'soup', 'canned soup', 'broth',
  'bread crumbs', 'breadcrumbs', 'panko',
  'tea', 'coffee', 'instant coffee',
  'boxed', 'shelf stable', 'shelf-stable'
];

// Items that should always be fridge (override pantry keywords if matched)
// Note: Be careful with single words that might be in compound pantry items
const FRIDGE_PRIORITY_KEYWORDS = [
  'fresh', 'raw', 'deli', 'sliced', 'cold cuts',
  'milk', 'cream', 'half and half', 'creamer',
  'yogurt', 'yoghurt', 'kefir',
  'cheese', 'shredded cheese', 'cream cheese', 'cottage cheese',
  'eggs', 'egg', 'dozen',
  'salted butter', 'unsalted butter', 'stick butter', 'margarine', // NOT just 'butter' - conflicts with 'peanut butter'
  'juice', 'orange juice', 'apple juice', 'lemonade',
  'produce', 'lettuce', 'spinach', 'kale', 'greens',
  'meat', 'chicken', 'beef', 'pork', 'turkey', 'ground',
  'fish', 'salmon', 'tilapia', 'cod', 'shrimp', 'seafood',
  'tofu', 'tempeh',
  'hummus', 'guacamole', 'salsa', 'dip'
];

/**
 * Determine storage location for a food item
 * @param {Object} item - Food item with name, category, etc.
 * @returns {string} 'fridge' | 'freezer' | 'pantry'
 */
export function assignStorageLocation(item) {
  const { name = '', category = '', modifier = '' } = item;
  const searchText = `${name} ${modifier}`.toLowerCase().trim();

  // Priority 1: Check for freezer keywords
  if (FREEZER_KEYWORDS.some(kw => searchText.includes(kw))) {
    return StorageLocation.FREEZER;
  }

  // Priority 2: Check for fridge priority items (fresh items that might match pantry keywords)
  if (FRIDGE_PRIORITY_KEYWORDS.some(kw => searchText.includes(kw))) {
    return StorageLocation.FRIDGE;
  }

  // Priority 3: Check for pantry keywords
  if (PANTRY_KEYWORDS.some(kw => searchText.includes(kw))) {
    return StorageLocation.PANTRY;
  }

  // Priority 4: Category-based assignment
  if (category && CATEGORY_STORAGE_MAP[category]) {
    return CATEGORY_STORAGE_MAP[category];
  }

  // Default: fridge (safest assumption for perishables)
  return StorageLocation.FRIDGE;
}

/**
 * Get shelf life in days for a specific storage location
 * Uses USDA data ranges when available
 * @param {number} minDays - Min shelf life
 * @param {number} maxDays - Max shelf life
 * @param {string} metric - Time unit (Days, Weeks, Months, Years)
 * @returns {number} Days (using conservative min value)
 */
function parseToDays(min, max, metric) {
  if (!metric || metric === 'Not Recommended') return null;
  if (metric === 'Indefinitely') return 9999;

  // Use min value for conservative estimate
  const value = min || max;
  if (!value) return null;

  switch (metric) {
    case 'Hours': return Math.ceil(value / 24);
    case 'Days': return value;
    case 'Weeks': return value * 7;
    case 'Months': return value * 30;
    case 'Year':
    case 'Years': return value * 365;
    default: return null;
  }
}

/**
 * Get storage-location-specific shelf life from USDA data
 * @param {Object} usdaProduct - Product from USDA parser
 * @param {string} storageLocation - Target storage location
 * @returns {number|null} Shelf life in days, or null if not available
 */
export function getShelfLifeForLocation(usdaProduct, storageLocation) {
  if (!usdaProduct?.storage) return null;

  const { storage } = usdaProduct;

  switch (storageLocation) {
    case StorageLocation.FREEZER:
      if (storage.freezer?.metric && storage.freezer.metric !== 'Not Recommended') {
        return parseToDays(storage.freezer.min, storage.freezer.max, storage.freezer.metric);
      }
      break;
    case StorageLocation.PANTRY:
      if (storage.pantry?.metric && storage.pantry.metric !== 'Not Recommended') {
        return parseToDays(storage.pantry.min, storage.pantry.max, storage.pantry.metric);
      }
      break;
    case StorageLocation.FRIDGE:
    default:
      if (storage.refrigerator?.metric && storage.refrigerator.metric !== 'Not Recommended') {
        return parseToDays(storage.refrigerator.min, storage.refrigerator.max, storage.refrigerator.metric);
      }
  }

  return null;
}

/**
 * Calculate new expiry date based on shelf life in days
 * @param {number} shelfLifeDays - Number of days
 * @param {Date} fromDate - Start date (defaults to today)
 * @returns {string} ISO date string
 */
export function calculateExpiryDate(shelfLifeDays, fromDate = new Date()) {
  const expiry = new Date(fromDate);
  expiry.setDate(expiry.getDate() + shelfLifeDays);
  return expiry.toISOString().split('T')[0];
}

export default assignStorageLocation;
