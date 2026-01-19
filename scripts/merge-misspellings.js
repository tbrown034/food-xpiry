/**
 * Merge existing misspelling keywords into the new USDA database
 */

const fs = require('fs');
const path = require('path');

// Common misspellings to add (extracted from your original database)
const misspellings = {
  // Dairy
  milk: ['milke', 'mlk', 'millk', 'mlik', 'milc'],
  eggs: ['egs', 'egss', 'eggss', 'eg', 'egggs'],
  butter: ['buttter', 'buttr', 'butr', 'buter'],
  yogurt: ['yoghurt', 'yogart', 'yougurt', 'yorgurt', 'yogrit', 'yogort', 'yougart'],
  cheese: ['cheeze', 'chese', 'cheez', 'cheees'],

  // Meat
  chicken: ['chiken', 'chickin', 'chikn', 'chickn'],
  turkey: ['turky', 'turkie', 'turkee'],
  beef: ['beaf', 'beff'],
  bacon: ['bakon', 'bacan'],
  sausage: ['sausege', 'sausige'],
  salmon: ['salman', 'samon', 'salomon'],
  shrimp: ['schrimp', 'shrinp'],

  // Vegetables
  lettuce: ['letuce', 'lettice'],
  spinach: ['spinich', 'spinish'],
  broccoli: ['brocoli', 'brocolli', 'broccolli'],
  cauliflower: ['calliflower', 'califlower', 'cauliflour', 'colliflower'],
  carrots: ['carots', 'carrott'],
  celery: ['cellery', 'celary'],
  cucumber: ['cuccumber', 'cucmber'],
  tomatoes: ['tomatoe', 'tomatos', 'tomatto'],
  peppers: ['peper'],
  onions: ['oinion', 'onoin'],
  garlic: ['garlick', 'garlik'],
  potatoes: ['potatos', 'potatoe', 'potatow', 'potatto'],
  mushrooms: ['mushroms', 'muchrooms', 'shrooms'],
  zucchini: ['zuchini', 'zuccini', 'zuchinni', 'zukini'],
  asparagus: ['aspargus', 'asperagus', 'aspargaus', 'asparugus'],
  avocado: ['avacado', 'avacodos', 'avocodo'],
  cilantro: ['cilanto', 'cilantrow'],
  parsley: ['parsely', 'parsly', 'parslely'],

  // Fruits
  apples: ['aples', 'appels'],
  bananas: ['banannas', 'bannana', 'banna', 'bannanas'],
  oranges: ['orang', 'oragne', 'organes', 'orangs', 'ornage', 'ornages'],
  lemons: ['lemmons', 'lemmon'],
  limes: ['lyme', 'lymes'],
  grapes: ['graeps', 'graps'],
  strawberries: ['strawberrys', 'strawberies', 'stawberries', 'stawberry'],
  blueberries: ['bluberries', 'blueberrys', 'bluberry', 'blueberrries'],
  raspberries: ['rasberries', 'raspberrys', 'rasberry', 'rasberrie'],
  blackberries: ['blackberrys', 'blackberies'],
  peaches: ['peachs', 'peche'],
  pears: ['pares', 'pare'],
  cherries: ['cherrys', 'cherrries'],
  watermelon: ['watermellon'],
  cantaloupe: ['cantalope', 'cantelope', 'cantaloup'],
  pineapple: ['pinapple', 'pinneaple', 'pineaple', 'pinneapple'],
  mango: ['manago'],
  kiwi: ['keewee'],

  // Bakery
  bread: ['bred', 'braed'],
  bagels: ['bagles', 'bagle'],
  tortillas: ['tortila', 'tortillas', 'tortila'],

  // Common prepared foods
  pizza: ['piza', 'pizzas'],
  burger: ['hamburger', 'burgur', 'hamburgur'],
  sushi: ['suchi', 'suschi'],
  hummus: ['humus', 'hummous', 'houmous', 'humis'],
  guacamole: ['guac', 'guacamole'],

  // Plant proteins
  tofu: ['tofoo', 'toffu'],
  tempeh: ['tempe', 'temphe', 'tempay'],

  // Fermented
  kimchi: ['kimchee'],
  sauerkraut: ['sourkraut'],
};

// Read the USDA database
const usdaDbPath = path.join(__dirname, '../lib/shelfLifeDatabase-usda.js');
let content = fs.readFileSync(usdaDbPath, 'utf8');

// For each misspelling entry, find matching items and add the variants
let addedCount = 0;

for (const [baseWord, variants] of Object.entries(misspellings)) {
  // Find lines that contain this base word in keywords
  const regex = new RegExp(`(${baseWord}[^:]*: \\{ days: \\d+, category: '[^']+', source: 'USDA', keywords: \\[)([^\\]]+)(\\] \\})`, 'gi');

  content = content.replace(regex, (match, prefix, keywords, suffix) => {
    // Check if variants already exist
    const existingKeywords = keywords.toLowerCase();
    const newVariants = variants.filter(v => !existingKeywords.includes(`"${v.toLowerCase()}"`));

    if (newVariants.length > 0) {
      addedCount += newVariants.length;
      const variantsStr = newVariants.map(v => `"${v}"`).join(',');
      return `${prefix}${keywords},${variantsStr}${suffix}`;
    }
    return match;
  });
}

// Write back
fs.writeFileSync(usdaDbPath, content);

console.log('Added ' + addedCount + ' misspelling variants to USDA database');

// Count total keywords
const keywordMatches = content.match(/keywords: \[[^\]]+\]/g) || [];
let totalKeywords = 0;
keywordMatches.forEach(m => {
  totalKeywords += (m.match(/"/g) || []).length / 2;
});
console.log('Total keywords in database: ~' + totalKeywords);
