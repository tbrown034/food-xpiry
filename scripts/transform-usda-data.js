/**
 * Transform USDA FoodKeeper JSON to shelfLifeDatabase.js format
 *
 * Source: Official USDA FSIS FoodKeeper Data
 * https://catalog.data.gov/dataset/fsis-foodkeeper-data
 * License: Creative Commons CCZero (public domain)
 */

const fs = require('fs');
const path = require('path');

// Load the official USDA data
const usdaData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../lib/usda-foodkeeper-official.json'), 'utf8')
);

// Extract categories from USDA data
const categories = {};
for (const sheet of usdaData.sheets) {
  if (sheet.name === 'Category') {
    for (const row of sheet.data) {
      const cat = {};
      for (const item of row) Object.assign(cat, item);
      categories[cat.ID] = {
        name: cat.Category_Name,
        subcategory: cat.Subcategory_Name
      };
    }
  }
}

// Map USDA categories to our simpler categories
const categoryMapping = {
  'Baby Food': 'Other',
  'Baked Goods': 'Bakery',
  'Beverages': 'Beverages',
  'Condiments, Sauces & Canned Goods': 'Pantry',
  'Dairy Products & Eggs': 'Dairy',
  'Food Purchased Frozen': 'Frozen',
  'Grains, Beans & Pasta': 'Pantry',
  'Meat': 'Meat',
  'Poultry': 'Meat',
  'Produce': 'Vegetables',
  'Seafood': 'Meat',
  'Shelf Stable Foods': 'Pantry',
  'Vegetarian Proteins': 'Other',
  'Deli & Prepared Foods': 'Other'
};

// Fruits keywords for produce category disambiguation
const fruitKeywords = ['apple', 'banana', 'orange', 'berry', 'grape', 'melon', 'peach', 'pear',
  'plum', 'cherry', 'mango', 'pineapple', 'kiwi', 'lemon', 'lime', 'grapefruit', 'tangerine',
  'nectarine', 'apricot', 'fig', 'date', 'pomegranate', 'papaya', 'guava', 'passion', 'coconut',
  'avocado', 'fruit'];

// Convert metric to days
function toDays(value, metric) {
  if (!value || !metric) return null;
  const v = parseFloat(value);
  switch (metric.toLowerCase()) {
    case 'days': return Math.round(v);
    case 'weeks': return Math.round(v * 7);
    case 'months': return Math.round(v * 30);
    case 'years': return Math.round(v * 365);
    default: return null;
  }
}

// Generate a safe key from name
function toKey(name, subtitle) {
  let key = name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 30);
  if (subtitle) {
    const subKey = subtitle.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 20);
    key = key + '_' + subKey;
  }
  return key.replace(/_+/g, '_').replace(/_$/, '');
}

// Generate keywords from name and subtitle
function generateKeywords(name, subtitle, usdaKeywords) {
  const keywords = new Set();

  // Add USDA provided keywords
  if (usdaKeywords) {
    usdaKeywords.split(',').forEach(k => {
      const clean = k.trim().toLowerCase();
      if (clean && clean.length > 1) keywords.add(clean);
    });
  }

  // Add name
  keywords.add(name.toLowerCase());

  // Add subtitle variations
  if (subtitle) {
    keywords.add(subtitle.toLowerCase());
    keywords.add((name + ' ' + subtitle).toLowerCase());
  }

  return Array.from(keywords);
}

// Process products
const products = [];
for (const sheet of usdaData.sheets) {
  if (sheet.name === 'Product') {
    for (const row of sheet.data) {
      const prod = {};
      for (const item of row) Object.assign(prod, item);

      const name = prod.Name;
      const subtitle = prod.Name_subtitle;
      const catInfo = categories[prod.Category_ID] || {};

      // Get refrigeration days (prefer DOP - Date of Purchase)
      let refMin = toDays(prod.DOP_Refrigerate_Min, prod.DOP_Refrigerate_Metric);
      let refMax = toDays(prod.DOP_Refrigerate_Max, prod.DOP_Refrigerate_Metric);

      // Fallback to regular refrigerate
      if (!refMin) {
        refMin = toDays(prod.Refrigerate_Min, prod.Refrigerate_Metric);
        refMax = toDays(prod.Refrigerate_Max, prod.Refrigerate_Metric);
      }

      // Fallback to pantry for shelf-stable items
      if (!refMin) {
        refMin = toDays(prod.DOP_Pantry_Min, prod.DOP_Pantry_Metric) ||
                 toDays(prod.Pantry_Min, prod.Pantry_Metric);
        refMax = toDays(prod.DOP_Pantry_Max, prod.DOP_Pantry_Metric) ||
                 toDays(prod.Pantry_Max, prod.Pantry_Metric);
      }

      // Skip if no storage data
      if (!refMin && !refMax) continue;

      // Use max or average
      const days = refMax || refMin || 7;

      // Determine category
      let category = categoryMapping[catInfo.name] || 'Other';

      // Override for fruits in Produce
      if (catInfo.name === 'Produce') {
        const nameLower = (name + ' ' + (subtitle || '')).toLowerCase();
        if (fruitKeywords.some(f => nameLower.includes(f))) {
          category = 'Fruits';
        }
      }

      products.push({
        key: toKey(name, subtitle),
        name,
        subtitle,
        days,
        category,
        keywords: generateKeywords(name, subtitle, prod.Keywords),
        tips: prod.Refrigerate_tips || prod.DOP_Refrigerate_tips || prod.Pantry_tips
      });
    }
  }
}

console.log('Processed ' + products.length + ' products from USDA FoodKeeper');
console.log('');
console.log('By category:');
const byCat = {};
products.forEach(p => {
  byCat[p.category] = (byCat[p.category] || 0) + 1;
});
Object.entries(byCat).sort((a,b) => b[1] - a[1]).forEach(([cat, count]) => {
  console.log('  ' + cat + ': ' + count);
});

// Generate the database file
const today = new Date().toISOString().split('T')[0];

let output = '/**\n';
output += ' * USDA FoodKeeper Database - Official Government Data\n';
output += ' * \n';
output += ' * SOURCE: USDA Food Safety and Inspection Service (FSIS)\n';
output += ' * URL: https://catalog.data.gov/dataset/fsis-foodkeeper-data\n';
output += ' * LICENSE: Creative Commons CCZero (Public Domain)\n';
output += ' * \n';
output += ' * Total Items: ' + products.length + '\n';
output += ' * Last Updated: ' + today + '\n';
output += ' * \n';
output += ' * This data represents CONSERVATIVE estimates for food safety.\n';
output += ' * When in doubt, follow the "when in doubt, throw it out" rule.\n';
output += ' */\n\n';

output += 'export const DATA_METADATA = {\n';
output += "  source: 'USDA FSIS FoodKeeper',\n";
output += "  url: 'https://catalog.data.gov/dataset/fsis-foodkeeper-data',\n";
output += "  license: 'CC0 - Public Domain',\n";
output += "  lastUpdated: '" + today + "',\n";
output += '  itemCount: ' + products.length + ',\n';
output += '};\n\n';

output += 'export const SHELF_LIFE_DATABASE = {\n';

// Group by category for readability
const byCategory = {};
products.forEach(p => {
  if (!byCategory[p.category]) byCategory[p.category] = [];
  byCategory[p.category].push(p);
});

const categoryOrder = ['Dairy', 'Meat', 'Vegetables', 'Fruits', 'Bakery', 'Beverages', 'Pantry', 'Frozen', 'Other'];

for (const category of categoryOrder) {
  const items = byCategory[category] || [];
  if (items.length === 0) continue;

  output += '  // ==================== ' + category.toUpperCase() + ' (' + items.length + ' items) ====================\n';

  for (const item of items) {
    const keywords = JSON.stringify(item.keywords);
    output += '  ' + item.key + ": { days: " + item.days + ", category: '" + category + "', source: 'USDA', keywords: " + keywords + ' },\n';
  }
  output += '\n';
}

output += '};\n\n';

output += '// Build keyword lookup map\n';
output += 'const buildKeywordMap = () => {\n';
output += '  const map = new Map();\n';
output += '  for (const [key, data] of Object.entries(SHELF_LIFE_DATABASE)) {\n';
output += '    for (const keyword of data.keywords) {\n';
output += '      const normalized = keyword.toLowerCase().trim();\n';
output += '      if (!map.has(normalized)) map.set(normalized, []);\n';
output += '      map.get(normalized).push({ key, ...data });\n';
output += '    }\n';
output += '  }\n';
output += '  return map;\n';
output += '};\n\n';

output += 'const KEYWORD_MAP = buildKeywordMap();\n\n';

output += '/**\n';
output += ' * Look up shelf life for an item by name\n';
output += ' */\n';
output += 'export function lookupShelfLife(itemName) {\n';
output += "  if (!itemName || typeof itemName !== 'string') {\n";
output += "    return { found: false, confidence: 'low' };\n";
output += '  }\n';
output += '  const normalized = itemName.toLowerCase().trim();\n';
output += '  \n';
output += '  // Exact match\n';
output += '  if (KEYWORD_MAP.has(normalized)) {\n';
output += '    const matches = KEYWORD_MAP.get(normalized);\n';
output += "    return { found: true, data: matches[0], confidence: 'high', matchedKey: matches[0].key };\n";
output += '  }\n';
output += '  \n';
output += '  // Partial match (longest first)\n';
output += '  const allKeywords = Array.from(KEYWORD_MAP.keys()).sort((a, b) => b.length - a.length);\n';
output += '  for (const keyword of allKeywords) {\n';
output += '    if (normalized.includes(keyword)) {\n';
output += '      const matches = KEYWORD_MAP.get(keyword);\n';
output += "      return { found: true, data: matches[0], confidence: 'medium', matchedKey: matches[0].key };\n";
output += '    }\n';
output += '  }\n';
output += '  \n';
output += "  return { found: false, confidence: 'low' };\n";
output += '}\n\n';

output += 'export const CATEGORIES = ' + JSON.stringify(categoryOrder) + ';\n\n';

output += 'export const DEFAULT_SHELF_LIFE = {\n';
output += '  Dairy: 7,\n';
output += '  Meat: 3,\n';
output += '  Vegetables: 7,\n';
output += '  Fruits: 5,\n';
output += '  Bakery: 5,\n';
output += '  Beverages: 7,\n';
output += '  Pantry: 365,\n';
output += '  Frozen: 90,\n';
output += '  Other: 7,\n';
output += '};\n';

// Write the output
const outputPath = path.join(__dirname, '../lib/shelfLifeDatabase-usda.js');
fs.writeFileSync(outputPath, output);
console.log('');
console.log('Written to: ' + outputPath);
