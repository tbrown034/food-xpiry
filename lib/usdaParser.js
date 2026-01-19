/**
 * USDA FoodKeeper Data Parser
 *
 * Transforms the raw USDA JSON into a clean, usable format
 * while preserving the full data structure (pantry/fridge/freezer, min/max, tips)
 */

import usdaData from './usda-foodkeeper-official.json';

// Parse storage time to days for comparison/sorting
function parseToDays(min, max, metric) {
  if (!metric || metric === 'Not Recommended') return null;
  if (metric === 'Indefinitely') return 9999;

  const avg = (min + max) / 2;

  switch (metric) {
    case 'Hours': return avg / 24;
    case 'Days': return avg;
    case 'Weeks': return avg * 7;
    case 'Months': return avg * 30;
    case 'Year':
    case 'Years': return avg * 365;
    default: return null;
  }
}

// Format storage time for display
function formatStorageTime(min, max, metric) {
  if (!metric) return null;
  if (metric === 'Not Recommended') return 'Not recommended';
  if (metric === 'Indefinitely') return 'Indefinitely';
  if (metric === 'When Ripe') return 'When ripe';
  if (metric === 'Package use-by date') return 'Use by date on package';

  if (min === max) {
    return `${min} ${metric.toLowerCase()}`;
  }
  return `${min}-${max} ${metric.toLowerCase()}`;
}

// Get field value from product row
function getField(product, fieldName) {
  for (const field of product) {
    if (field[fieldName] !== undefined) {
      return field[fieldName];
    }
  }
  return null;
}

// Parse categories
function parseCategories() {
  const categorySheet = usdaData.sheets.find(s => s.name === 'Category');
  if (!categorySheet) return {};

  const categories = {};
  for (const row of categorySheet.data) {
    const id = getField(row, 'ID');
    const name = getField(row, 'Category_Name');
    const subcategory = getField(row, 'Subcategory_Name');

    categories[id] = {
      id,
      name,
      subcategory,
      fullName: subcategory ? `${name} > ${subcategory}` : name
    };
  }
  return categories;
}

// Parse products
function parseProducts(categories) {
  const productSheet = usdaData.sheets.find(s => s.name === 'Product');
  if (!productSheet) return [];

  return productSheet.data.map(row => {
    const categoryId = getField(row, 'Category_ID');
    const category = categories[categoryId] || { name: 'Unknown', fullName: 'Unknown' };

    // Build storage object
    const storage = {
      pantry: {
        min: getField(row, 'DOP_Pantry_Min'),
        max: getField(row, 'DOP_Pantry_Max'),
        metric: getField(row, 'DOP_Pantry_Metric'),
        tips: getField(row, 'Pantry_tips') || getField(row, 'DOP_Pantry_tips'),
        afterOpening: {
          min: getField(row, 'Pantry_After_Opening_Min'),
          max: getField(row, 'Pantry_After_Opening_Max'),
          metric: getField(row, 'Pantry_After_Opening_Metric'),
        }
      },
      refrigerator: {
        // Use DOP (Date of Purchase) for unopened, regular for opened/cooked items
        min: getField(row, 'DOP_Refrigerate_Min') || getField(row, 'Refrigerate_Min'),
        max: getField(row, 'DOP_Refrigerate_Max') || getField(row, 'Refrigerate_Max'),
        metric: getField(row, 'DOP_Refrigerate_Metric') || getField(row, 'Refrigerate_Metric'),
        tips: getField(row, 'Refrigerate_tips') || getField(row, 'DOP_Refrigerate_tips'),
        afterOpening: {
          min: getField(row, 'Refrigerate_After_Opening_Min'),
          max: getField(row, 'Refrigerate_After_Opening_Max'),
          metric: getField(row, 'Refrigerate_After_Opening_Metric'),
        },
        afterThawing: {
          min: getField(row, 'Refrigerate_After_Thawing_Min'),
          max: getField(row, 'Refrigerate_After_Thawing_Max'),
          metric: getField(row, 'Refrigerate_After_Thawing_Metric'),
        }
      },
      freezer: {
        min: getField(row, 'DOP_Freeze_Min') || getField(row, 'Freeze_Min'),
        max: getField(row, 'DOP_Freeze_Max') || getField(row, 'Freeze_Max'),
        metric: getField(row, 'DOP_Freeze_Metric') || getField(row, 'Freeze_Metric'),
        tips: getField(row, 'Freeze_Tips') || getField(row, 'DOP_Freeze_Tips'),
      }
    };

    // Calculate days for sorting (use refrigerator as primary)
    const fridgeDays = parseToDays(
      storage.refrigerator.min,
      storage.refrigerator.max,
      storage.refrigerator.metric
    );

    return {
      id: getField(row, 'ID'),
      name: getField(row, 'Name'),
      subtitle: getField(row, 'Name_subtitle'),
      fullName: getField(row, 'Name') + (getField(row, 'Name_subtitle') ? ` (${getField(row, 'Name_subtitle')})` : ''),
      keywords: (getField(row, 'Keywords') || '').split(',').map(k => k.trim()).filter(Boolean),
      category: category.name,
      subcategory: category.subcategory,
      categoryFullName: category.fullName,
      storage,
      // Formatted display strings
      display: {
        pantry: formatStorageTime(storage.pantry.min, storage.pantry.max, storage.pantry.metric),
        refrigerator: formatStorageTime(storage.refrigerator.min, storage.refrigerator.max, storage.refrigerator.metric),
        freezer: formatStorageTime(storage.freezer.min, storage.freezer.max, storage.freezer.metric),
      },
      // Numeric days for sorting
      fridgeDays,
      // Safety flag: items with very short fridge life are safety-critical
      isHighRisk: fridgeDays !== null && fridgeDays <= 2,
    };
  });
}

// Parse cooking tips
function parseCookingTips() {
  const tipsSheet = usdaData.sheets.find(s => s.name === 'CookingTips');
  if (!tipsSheet) return {};

  const tips = {};
  for (const row of tipsSheet.data) {
    const productId = getField(row, 'Product_ID');
    if (!tips[productId]) tips[productId] = [];

    tips[productId].push({
      tip: getField(row, 'Tips'),
      safeMinTemp: getField(row, 'Safe_Minimum_Temperature'),
      restTime: getField(row, 'Rest_Time'),
      restTimeMetric: getField(row, 'Rest_Time_metric'),
    });
  }
  return tips;
}

// Main export: parsed USDA data
const categories = parseCategories();
const products = parseProducts(categories);
const cookingTips = parseCookingTips();

// Add cooking tips to products
for (const product of products) {
  product.cookingTips = cookingTips[product.id] || [];
}

// Get unique category names for filtering
const categoryNames = [...new Set(products.map(p => p.category))].sort();
const categoryFullNames = [...new Set(products.map(p => p.categoryFullName))].sort();

export const USDA_DATA = {
  version: usdaData.fileName,
  products,
  categories: categoryNames,
  categoriesWithSub: categoryFullNames,
  totalItems: products.length,
  metadata: {
    source: 'USDA Food Safety and Inspection Service (FSIS)',
    url: 'https://catalog.data.gov/dataset/fsis-foodkeeper-data',
    license: 'CC0 - Public Domain',
  }
};

export default USDA_DATA;
