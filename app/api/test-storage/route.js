/**
 * Test API Route for Storage Location Assignment
 * GET /api/test-storage
 */

import { assignStorageLocation } from '../../../lib/storageLocationAssigner';
import { StorageLocation, Category } from '../../../lib/types';
import { parseItem } from '../../../lib/localParser';

export async function GET() {
  const results = [];
  let passed = 0;
  let failed = 0;

  function test(description, actual, expected) {
    const success = actual === expected;
    if (success) passed++;
    else failed++;
    results.push({
      test: description,
      expected,
      actual,
      passed: success,
    });
  }

  // ============================================
  // Freezer Detection Tests
  // ============================================
  test('frozen pizza → freezer',
    assignStorageLocation({ name: 'frozen pizza', category: '' }),
    StorageLocation.FREEZER
  );
  test('DiGiorno pizza → freezer',
    assignStorageLocation({ name: 'DiGiorno pizza', category: '' }),
    StorageLocation.FREEZER
  );
  test('ice cream → freezer',
    assignStorageLocation({ name: 'ice cream', category: '' }),
    StorageLocation.FREEZER
  );
  test('Hot Pockets → freezer',
    assignStorageLocation({ name: 'Hot Pockets', category: '' }),
    StorageLocation.FREEZER
  );
  test('Eggo waffles → freezer',
    assignStorageLocation({ name: 'Eggo waffles', category: '' }),
    StorageLocation.FREEZER
  );
  test('tater tots → freezer',
    assignStorageLocation({ name: 'tater tots', category: '' }),
    StorageLocation.FREEZER
  );

  // ============================================
  // Pantry Detection Tests
  // ============================================
  test('Cheerios → pantry',
    assignStorageLocation({ name: 'Cheerios', category: '' }),
    StorageLocation.PANTRY
  );
  test('pasta → pantry',
    assignStorageLocation({ name: 'pasta', category: '' }),
    StorageLocation.PANTRY
  );
  test('rice → pantry',
    assignStorageLocation({ name: 'rice', category: '' }),
    StorageLocation.PANTRY
  );
  test('canned beans → pantry',
    assignStorageLocation({ name: 'canned beans', category: '' }),
    StorageLocation.PANTRY
  );
  test('peanut butter → pantry',
    assignStorageLocation({ name: 'peanut butter', category: '' }),
    StorageLocation.PANTRY
  );
  test('olive oil → pantry',
    assignStorageLocation({ name: 'olive oil', category: '' }),
    StorageLocation.PANTRY
  );
  test('honey → pantry',
    assignStorageLocation({ name: 'honey', category: '' }),
    StorageLocation.PANTRY
  );

  // ============================================
  // Fridge Priority Tests
  // ============================================
  test('fresh chicken → fridge',
    assignStorageLocation({ name: 'fresh chicken', category: '' }),
    StorageLocation.FRIDGE
  );
  test('milk → fridge',
    assignStorageLocation({ name: 'milk', category: '' }),
    StorageLocation.FRIDGE
  );
  test('eggs → fridge',
    assignStorageLocation({ name: 'eggs', category: '' }),
    StorageLocation.FRIDGE
  );
  test('yogurt → fridge',
    assignStorageLocation({ name: 'yogurt', category: '' }),
    StorageLocation.FRIDGE
  );
  test('cheese → fridge',
    assignStorageLocation({ name: 'cheese', category: '' }),
    StorageLocation.FRIDGE
  );
  test('butter → fridge',
    assignStorageLocation({ name: 'butter', category: '' }),
    StorageLocation.FRIDGE
  );
  test('orange juice → fridge',
    assignStorageLocation({ name: 'orange juice', category: '' }),
    StorageLocation.FRIDGE
  );
  test('lettuce → fridge',
    assignStorageLocation({ name: 'lettuce', category: '' }),
    StorageLocation.FRIDGE
  );
  test('salmon → fridge',
    assignStorageLocation({ name: 'salmon', category: '' }),
    StorageLocation.FRIDGE
  );
  test('hummus → fridge',
    assignStorageLocation({ name: 'hummus', category: '' }),
    StorageLocation.FRIDGE
  );

  // ============================================
  // Category Fallback Tests
  // ============================================
  test('Frozen category → freezer',
    assignStorageLocation({ name: 'unknown', category: Category.FROZEN }),
    StorageLocation.FREEZER
  );
  test('Pantry category → pantry',
    assignStorageLocation({ name: 'unknown', category: Category.PANTRY }),
    StorageLocation.PANTRY
  );
  test('Dairy category → fridge',
    assignStorageLocation({ name: 'unknown', category: Category.DAIRY }),
    StorageLocation.FRIDGE
  );
  test('No category → fridge (default)',
    assignStorageLocation({ name: 'mystery', category: '' }),
    StorageLocation.FRIDGE
  );

  // ============================================
  // Full Parser Integration Tests
  // ============================================
  let result;

  result = parseItem('frozen pizza');
  test('parseItem("frozen pizza") → freezer',
    result.parsed?.storageLocation,
    StorageLocation.FREEZER
  );

  result = parseItem('DiGiorno pepperoni pizza');
  test('parseItem("DiGiorno pepperoni pizza") → freezer',
    result.parsed?.storageLocation,
    StorageLocation.FREEZER
  );

  result = parseItem('Cheerios cereal');
  test('parseItem("Cheerios cereal") → pantry',
    result.parsed?.storageLocation,
    StorageLocation.PANTRY
  );

  result = parseItem('eggs');
  test('parseItem("eggs") → fridge',
    result.parsed?.storageLocation,
    StorageLocation.FRIDGE
  );

  result = parseItem('chicken breast');
  test('parseItem("chicken breast") → fridge',
    result.parsed?.storageLocation,
    StorageLocation.FRIDGE
  );

  result = parseItem('ice cream');
  test('parseItem("ice cream") → freezer',
    result.parsed?.storageLocation,
    StorageLocation.FREEZER
  );

  result = parseItem('peanut butter');
  test('parseItem("peanut butter") → pantry',
    result.parsed?.storageLocation,
    StorageLocation.PANTRY
  );

  result = parseItem('milk');
  test('parseItem("milk") → fridge',
    result.parsed?.storageLocation,
    StorageLocation.FRIDGE
  );

  // ============================================
  // Real-world Receipt Items
  // ============================================
  const receiptItems = [
    { input: '2% milk gallon', expected: StorageLocation.FRIDGE },
    { input: 'dozen eggs', expected: StorageLocation.FRIDGE },
    { input: 'Tyson chicken breast', expected: StorageLocation.FRIDGE },
    { input: 'DiGiorno rising crust pizza', expected: StorageLocation.FREEZER },
    { input: 'Ben & Jerry ice cream', expected: StorageLocation.FREEZER },
    { input: 'Barilla spaghetti', expected: StorageLocation.PANTRY },
    { input: 'Jif peanut butter', expected: StorageLocation.PANTRY },
    { input: 'Dannon Greek yogurt', expected: StorageLocation.FRIDGE },
    { input: 'Kraft shredded cheese', expected: StorageLocation.FRIDGE },
    { input: 'Birds Eye frozen peas', expected: StorageLocation.FREEZER },
    { input: 'Campbell soup', expected: StorageLocation.PANTRY },
    { input: 'Quaker oats', expected: StorageLocation.PANTRY },
    { input: 'Stouffers lasagna', expected: StorageLocation.FREEZER },
    { input: 'Tropicana orange juice', expected: StorageLocation.FRIDGE },
  ];

  for (const item of receiptItems) {
    result = parseItem(item.input);
    test(`parseItem("${item.input}") → ${item.expected}`,
      result.parsed?.storageLocation,
      item.expected
    );
  }

  return Response.json({
    summary: {
      total: passed + failed,
      passed,
      failed,
      passRate: `${Math.round((passed / (passed + failed)) * 100)}%`,
    },
    results,
  });
}
