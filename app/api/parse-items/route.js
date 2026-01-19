import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from 'next/server';
import { logError, createErrorResponse, validateInput } from '../../../lib/errorHandling';
import { parseItems, processItems } from '../../../lib/localParser';
import { lookupShelfLife, inferCategory, DEFAULT_SHELF_LIFE } from '../../../lib/shelfLifeDatabase';
import { checkRateLimit, clampShelfLifeDays, getExpiryStatusSafe } from '../../../lib/validation';
import { assignStorageLocation } from '../../../lib/storageLocationAssigner';

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("❌ ANTHROPIC_API_KEY environment variable is not set");
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * HYBRID PARSING STRATEGY
 *
 * 1. Try local parsing first (instant, free)
 * 2. Only call AI for items that couldn't be matched locally
 * 3. Return combined results with full shelf life data
 *
 * This reduces API calls by 50-90% for common items like "milk, eggs, bread"
 */

const AI_PARSE_SYSTEM_PROMPT = `You are a grocery list parser with spell correction. Parse the user's input and extract structured grocery items.

IMPORTANT SPELLING RULES:
- ALWAYS correct misspellings to proper English (e.g., "potatos" → "Potatoes", "tomatoe" → "Tomato")
- Fix common typos: double letters (buttter→Butter), missing letters (bluberries→Blueberries)
- Keep modifiers with their food (e.g., "org strawberries" → name: "Strawberries", modifier: "Organic")
- Never split compound items like "fresh parsley" or "org apples" into separate items

Return JSON only (no markdown):
{
  "items": [
    {
      "name": "Item Name (CORRECTED SPELLING)",
      "modifier": "descriptors (organic, 2 lbs, etc)",
      "quantity": 1,
      "category": "Dairy|Meat|Vegetables|Fruits|Bakery|Beverages|Pantry|Frozen|Other",
      "foodType": "store-bought|premade|leftover",
      "shelfLifeDays": 7,
      "storageRecommendations": "Brief storage tip"
    }
  ]
}

Rules:
- name: Simple food name with CORRECT spelling, capitalized (e.g., "Chicken Breast", NOT "chiken brest")
- modifier: Brand, size, preparation (e.g., "Organic, boneless") - extract "org", "fresh", etc. as modifiers
- foodType: "store-bought" for packaged, "premade" for deli/prepared, "leftover" for cooked/opened
- shelfLifeDays: Conservative estimate for refrigerator storage
- Leftovers/premade: MAX 4 days
- Raw poultry/ground meat: MAX 2 days

Common misspellings to correct:
- potatos/potatoe → Potatoes
- tomatoe → Tomato
- pinapple → Pineapple
- bluberries/bluberry → Blueberries
- rasberries/rasberry → Raspberries
- aspargus → Asparagus
- brocoli/brocolli → Broccoli
- calliflower → Cauliflower
- zuchini/zuchinni → Zucchini
- parsely → Parsley
- cheeze/chese → Cheese
- yogart/yougurt → Yogurt
- buttter/buttr → Butter
- bannana/banannas → Bananas`;

async function parseWithAI(itemsToParseWithAI) {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2000,
    system: AI_PARSE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Parse these items:\n\n${itemsToParseWithAI.join('\n')}`
      }
    ]
  });

  let responseText = message.content.find(block => block.type === 'text')?.text;
  if (!responseText) {
    throw new Error("No text content in AI response");
  }

  // Strip markdown if present
  responseText = responseText.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  return JSON.parse(responseText);
}

export async function POST(request) {
  const startTime = Date.now();

  try {
    // Rate limiting
    const rateLimit = checkRateLimit('api:parse-items:global', { perMinute: 30, perHour: 200, perDay: 1000 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.error },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
      );
    }

    const body = await request.json();
    const { items, rawText } = body;

    // Get input text
    let inputText;
    if (rawText) {
      inputText = rawText;
    } else if (Array.isArray(items)) {
      inputText = items.join('\n');
    } else if (items) {
      inputText = items;
    } else {
      return createErrorResponse('Please enter at least one item to add.', new Error('No items'), 400);
    }

    // Validate input
    const validation = validateInput(inputText, { maxLength: 10000, minLength: 1 });
    if (!validation.isValid) {
      return createErrorResponse(validation.error, new Error(validation.error), 400);
    }

    const inputItems = validation.sanitized.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    console.log(`📝 Processing ${inputItems.length} items...`);

    // ==================== STEP 1: LOCAL PARSING ====================
    console.log('🔍 Step 1: Trying local parsing...');

    const localResult = parseItems(inputItems);
    const localItems = localResult.items;
    const unknownItems = localResult.needsAI;

    console.log(`✅ Local: ${localItems.length - unknownItems.length} items matched, ${unknownItems.length} need AI`);

    // ==================== STEP 2: AI PARSING (only if needed) ====================
    let aiItems = [];

    if (unknownItems.length > 0 && process.env.ANTHROPIC_API_KEY) {
      console.log(`🤖 Step 2: AI parsing for ${unknownItems.length} unknown items...`);

      try {
        const aiResult = await parseWithAI(unknownItems);
        aiItems = aiResult.items || [];
        console.log(`✅ AI: Parsed ${aiItems.length} items`);
      } catch (aiError) {
        console.error('⚠️ AI parsing failed, using defaults:', aiError.message);
        // Fall back to defaults for unknown items
        aiItems = unknownItems.map(item => ({
          name: item.charAt(0).toUpperCase() + item.slice(1),
          modifier: '',
          quantity: 1,
          category: inferCategory(item),
          foodType: 'store-bought',
          shelfLifeDays: DEFAULT_SHELF_LIFE[inferCategory(item)] || 7,
          storageRecommendations: 'Store in refrigerator',
          source: 'default'
        }));
      }
    }

    // ==================== STEP 3: MERGE & PROCESS RESULTS ====================
    console.log('📦 Step 3: Merging results...');

    // Combine local and AI items, prioritizing local matches
    const finalItems = [];
    const today = new Date().toISOString().split('T')[0];

    // Add locally parsed items (already have shelf life)
    for (const item of localItems) {
      // Skip items that were sent to AI (they'll be in aiItems)
      if (unknownItems.includes(item.name.toLowerCase()) || !item.shelfLifeDays) {
        continue;
      }

      // Clamp shelf life to valid range
      const safeDays = clampShelfLifeDays(item.shelfLifeDays);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + safeDays);
      const expiryDateStr = expiryDate.toISOString().split('T')[0];

      finalItems.push({
        name: item.name,
        modifier: item.modifier || '',
        quantity: item.quantity || 1,
        category: item.category,
        foodType: item.foodType || 'store-bought',
        shelfLifeDays: safeDays,
        purchaseDate: today,
        expiryDate: expiryDateStr,
        daysUntilExpiry: safeDays,
        status: getExpiryStatusSafe(expiryDateStr),
        source: item.source || 'USDA',
        // CRITICAL: Include dateType for safety vs quality distinction
        dateType: item.dateType || 'quality',
        confidence: 'high',
        isPerishable: true,
        storageRecommendations: getStorageTip(item.name, item.category),
        // Storage location auto-assigned by localParser
        storageLocation: item.storageLocation,
      });
    }

    // Add AI-parsed items
    for (const item of aiItems) {
      // Clamp shelf life to valid range
      const safeDays = clampShelfLifeDays(item.shelfLifeDays || DEFAULT_SHELF_LIFE[item.category] || 7);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + safeDays);
      const expiryDateStr = expiryDate.toISOString().split('T')[0];

      // Determine dateType for AI items based on category and foodType
      // High-risk foods (raw meat, poultry, fish, leftovers) = safety dates
      const aiDateType = determineAIDateType(item);

      finalItems.push({
        name: item.name,
        modifier: item.modifier || '',
        quantity: item.quantity || 1,
        category: item.category || 'Other',
        foodType: item.foodType || 'store-bought',
        shelfLifeDays: safeDays,
        purchaseDate: today,
        expiryDate: expiryDateStr,
        daysUntilExpiry: safeDays,
        status: getExpiryStatusSafe(expiryDateStr),
        source: 'AI',
        // CRITICAL: Include dateType for safety vs quality distinction
        dateType: aiDateType,
        confidence: 'medium',
        isPerishable: true,
        storageRecommendations: item.storageRecommendations || getStorageTip(item.name, item.category),
        // Auto-assign storage location for AI items
        storageLocation: assignStorageLocation({ name: item.name, category: item.category, modifier: item.modifier }),
      });
    }

    // ==================== STEP 4: RETURN RESULTS ====================
    const elapsed = Date.now() - startTime;
    const usedAI = unknownItems.length > 0;

    console.log(`✅ Complete: ${finalItems.length} items in ${elapsed}ms (AI: ${usedAI ? 'yes' : 'no'})`);

    return NextResponse.json({
      items: finalItems,
      count: finalItems.length,
      message: `Successfully processed ${finalItems.length} items.`,
      meta: {
        localMatches: localItems.length - unknownItems.length,
        aiMatches: aiItems.length,
        usedAI,
        processingTime: elapsed,
        strategy: usedAI ? 'hybrid' : 'local-only'
      }
    });

  } catch (error) {
    logError(error, { endpoint: 'parse-items', method: 'POST' });
    return createErrorResponse('Could not process items. Please try again.', error, 500);
  }
}

/**
 * Get storage recommendation based on item and category
 */
function getStorageTip(name, category) {
  const tips = {
    Dairy: 'Keep refrigerated at 40°F or below.',
    Meat: 'Keep refrigerated at 40°F or below. Freeze if not using within 2 days.',
    Vegetables: 'Store in crisper drawer. Keep dry.',
    Fruits: 'Refrigerate ripe fruits. Store unripe at room temperature.',
    Bakery: 'Store at room temperature or freeze for longer storage.',
    Beverages: 'Refrigerate after opening.',
    Other: 'Refrigerate after opening.',
  };

  // Specific tips
  const lowerName = name.toLowerCase();
  if (lowerName.includes('chicken') || lowerName.includes('poultry')) {
    return 'Keep refrigerated at 40°F or below. Cook or freeze within 1-2 days.';
  }
  if (lowerName.includes('ground')) {
    return 'Keep refrigerated at 40°F or below. Cook or freeze within 1-2 days.';
  }
  if (lowerName.includes('fish') || lowerName.includes('seafood')) {
    return 'Keep refrigerated at 40°F or below. Cook within 1-2 days for best quality.';
  }
  if (lowerName.includes('leftover')) {
    return 'Use within 3-4 days. Reheat to 165°F before eating.';
  }

  return tips[category] || tips.Other;
}

/**
 * Determine dateType for AI-parsed items based on category and foodType
 * High-risk foods should be marked as 'safety' dates, others as 'quality'
 *
 * Safety dates (FDA guidelines - consume by date):
 * - Raw poultry, meat, fish, seafood
 * - Leftovers and premade foods
 * - Ground meats
 *
 * Quality dates (USDA FoodKeeper - peak freshness):
 * - Everything else
 */
function determineAIDateType(item) {
  const name = (item.name || '').toLowerCase();
  const category = (item.category || '').toLowerCase();
  const foodType = (item.foodType || '').toLowerCase();

  // Leftovers and premade items are ALWAYS safety dates
  if (foodType === 'leftover' || foodType === 'premade') {
    return 'safety';
  }

  // Meat category items need further analysis
  if (category === 'meat') {
    // Raw poultry - safety
    if (name.includes('chicken') || name.includes('turkey') ||
        name.includes('duck') || name.includes('poultry')) {
      return 'safety';
    }
    // Ground meats - safety
    if (name.includes('ground')) {
      return 'safety';
    }
    // Fish and seafood - safety
    if (name.includes('fish') || name.includes('salmon') ||
        name.includes('tuna') || name.includes('shrimp') ||
        name.includes('crab') || name.includes('lobster') ||
        name.includes('seafood') || name.includes('shellfish')) {
      return 'safety';
    }
    // Raw/fresh meats (not processed) - safety
    if (name.includes('raw') || name.includes('fresh')) {
      return 'safety';
    }
  }

  // Default to quality for all other items
  return 'quality';
}
