/**
 * Test Script: Storage Location Assignment
 *
 * Tests the auto-assignment logic for storage locations
 * Run with: node scripts/test-storage-location.js
 */

import { assignStorageLocation } from '../lib/storageLocationAssigner.js';
import { StorageLocation, Category } from '../lib/types.js';
import { parseItem } from '../lib/localParser.js';

// Test utilities
let passed = 0;
let failed = 0;

function test(description, actual, expected) {
  if (actual === expected) {
    console.log(`  ✅ ${description}`);
    passed++;
  } else {
    console.log(`  ❌ ${description}`);
    console.log(`     Expected: ${expected}`);
    console.log(`     Actual: ${actual}`);
    failed++;
  }
}

function testGroup(name, fn) {
  console.log(`\n📦 ${name}`);
  console.log('─'.repeat(50));
  fn();
}

// ============================================
// TEST 1: Direct Storage Location Assignment
// ============================================

testGroup('Freezer Detection (Keywords)', () => {
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

  test('frozen vegetables → freezer',
    assignStorageLocation({ name: 'frozen vegetables', category: '' }),
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

  test('fish sticks → freezer',
    assignStorageLocation({ name: 'fish sticks', category: '' }),
    StorageLocation.FREEZER
  );
});

testGroup('Pantry Detection (Keywords)', () => {
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

  test('crackers → pantry',
    assignStorageLocation({ name: 'crackers', category: '' }),
    StorageLocation.PANTRY
  );

  test('oatmeal → pantry',
    assignStorageLocation({ name: 'oatmeal', category: '' }),
    StorageLocation.PANTRY
  );

  test('honey → pantry',
    assignStorageLocation({ name: 'honey', category: '' }),
    StorageLocation.PANTRY
  );
});

testGroup('Fridge Priority (Fresh items override pantry keywords)', () => {
  test('fresh chicken → fridge (not pantry despite "chicken")',
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
});

testGroup('Category Fallback', () => {
  test('unknown item with Frozen category → freezer',
    assignStorageLocation({ name: 'some item', category: Category.FROZEN }),
    StorageLocation.FREEZER
  );

  test('unknown item with Pantry category → pantry',
    assignStorageLocation({ name: 'some item', category: Category.PANTRY }),
    StorageLocation.PANTRY
  );

  test('unknown item with Dairy category → fridge',
    assignStorageLocation({ name: 'some item', category: Category.DAIRY }),
    StorageLocation.FRIDGE
  );

  test('unknown item with Meat category → fridge',
    assignStorageLocation({ name: 'some item', category: Category.MEAT }),
    StorageLocation.FRIDGE
  );

  test('unknown item with no category → fridge (default)',
    assignStorageLocation({ name: 'mystery item', category: '' }),
    StorageLocation.FRIDGE
  );
});

// ============================================
// TEST 2: Full Parser Integration
// ============================================

testGroup('Full Parser Integration (parseItem)', () => {
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
});

// ============================================
// TEST 3: Edge Cases
// ============================================

testGroup('Edge Cases', () => {
  test('empty name → fridge (default)',
    assignStorageLocation({ name: '', category: '' }),
    StorageLocation.FRIDGE
  );

  test('modifier in name: "frozen chicken" → freezer',
    assignStorageLocation({ name: 'frozen chicken', category: '' }),
    StorageLocation.FREEZER
  );

  test('Case insensitive: "FROZEN PIZZA" → freezer',
    assignStorageLocation({ name: 'FROZEN PIZZA', category: '' }),
    StorageLocation.FREEZER
  );

  test('With modifier prop: chicken + frozen modifier → freezer',
    assignStorageLocation({ name: 'chicken', modifier: 'frozen', category: '' }),
    StorageLocation.FREEZER
  );
});

// ============================================
// TEST 4: Real-world Receipt Items
// ============================================

testGroup('Real-world Receipt Items', () => {
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
    { input: 'Oscar Mayer bacon', expected: StorageLocation.FRIDGE },
    { input: 'Stouffers lasagna', expected: StorageLocation.FREEZER },
    { input: 'Tropicana orange juice', expected: StorageLocation.FRIDGE },
  ];

  for (const item of receiptItems) {
    const result = parseItem(item.input);
    test(`"${item.input}" → ${item.expected}`,
      result.parsed?.storageLocation,
      item.expected
    );
  }
});

// ============================================
// Summary
// ============================================

console.log('\n' + '═'.repeat(50));
console.log(`📊 TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(50));

if (failed > 0) {
  console.log('\n⚠️  Some tests failed! Review the output above.\n');
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed!\n');
  process.exit(0);
}
