import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { lookupShelfLife, inferCategory, DEFAULT_SHELF_LIFE } from '../../../lib/shelfLifeDatabase';
import { getFoodEmoji } from '../../../lib/foodEmojis';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ==================== RATE LIMITING ====================
const RATE_LIMITS = {
  WINDOW_MS: 60 * 1000,      // 1 minute
  MAX_REQUESTS: 10,           // 10 requests per minute
  MAX_PER_HOUR: 100,          // 100 per hour
  MAX_PER_DAY: 500            // 500 per day
};

// In-memory rate limiter (production: use Redis)
const rateLimits = new Map();

function getClientIP(headersList) {
  // Try various headers for client IP
  const forwardedFor = headersList.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return headersList.get('x-real-ip') || 'anonymous';
}

function checkRateLimit(clientIP) {
  const now = Date.now();
  const userKey = `quick-shelf:${clientIP}`;

  if (!rateLimits.has(userKey)) {
    rateLimits.set(userKey, {
      requests: [],
      hourlyCount: 0,
      dailyCount: 0,
      hourReset: now + 3600000,
      dayReset: now + 86400000
    });
  }

  const userData = rateLimits.get(userKey);

  // Clean old requests (older than 1 minute)
  userData.requests = userData.requests.filter(
    time => now - time < RATE_LIMITS.WINDOW_MS
  );

  // Reset hourly/daily counters
  if (now > userData.hourReset) {
    userData.hourlyCount = 0;
    userData.hourReset = now + 3600000;
  }
  if (now > userData.dayReset) {
    userData.dailyCount = 0;
    userData.dayReset = now + 86400000;
  }

  // Check limits
  if (userData.requests.length >= RATE_LIMITS.MAX_REQUESTS) {
    const resetIn = Math.ceil((userData.requests[0] + RATE_LIMITS.WINDOW_MS - now) / 1000);
    throw new Error(`Rate limit exceeded. Please wait ${resetIn} seconds.`);
  }

  if (userData.hourlyCount >= RATE_LIMITS.MAX_PER_HOUR) {
    throw new Error(`Hourly limit reached. Please try again later.`);
  }

  if (userData.dailyCount >= RATE_LIMITS.MAX_PER_DAY) {
    throw new Error(`Daily limit reached. Please try again tomorrow.`);
  }

  // Add current request
  userData.requests.push(now);
  userData.hourlyCount++;
  userData.dailyCount++;

  return { remaining: RATE_LIMITS.MAX_REQUESTS - userData.requests.length };
}

export async function POST(request) {
  try {
    // Get client IP for rate limiting
    const headersList = await headers();
    const clientIP = getClientIP(headersList);

    // Check rate limits
    try {
      checkRateLimit(clientIP);
    } catch (rateLimitError) {
      return NextResponse.json(
        { error: rateLimitError.message },
        { status: 429 }
      );
    }

    const { itemName } = await request.json();

    if (!itemName || !itemName.trim()) {
      return NextResponse.json({ error: 'Item name required' }, { status: 400 });
    }

    // Validate input length
    if (itemName.length > 200) {
      return NextResponse.json({ error: 'Item name too long' }, { status: 400 });
    }

    const cleanItemName = itemName.trim();
    console.log(`Getting quick shelf life answer for: ${cleanItemName}`);

    // ==================== STEP 1: TRY LOCAL DATABASE FIRST ====================
    console.log('🔍 Trying local database lookup first...');
    const localLookup = lookupShelfLife(cleanItemName);

    if (localLookup.found) {
      console.log(`✅ Local match found: ${localLookup.matchedKey}`);

      const today = new Date();
      const shelfDays = localLookup.data.days;
      const expiryDate = new Date(today);
      expiryDate.setDate(expiryDate.getDate() + shelfDays);

      // Generate friendly answer from local data
      const category = localLookup.data.category;
      const source = localLookup.data.source || 'USDA';
      const dateType = localLookup.data.dateType || 'quality';

      const storageRec = getStorageRecommendation(cleanItemName, category);
      const answer = generateLocalAnswer(cleanItemName, shelfDays, category, dateType);

      return NextResponse.json({
        name: formatItemName(cleanItemName),
        category: category,
        answer: answer,
        storageRecommendations: storageRec,
        shelfLifeDays: shelfDays,
        purchaseDate: today.toISOString().split('T')[0],
        expiryDate: expiryDate.toISOString().split('T')[0],
        addedManually: true,
        dateType: dateType,
        source: source,
        confidence: 'high',
        matchedKey: localLookup.matchedKey,
      });
    }

    // ==================== STEP 2: FALL BACK TO AI FOR UNKNOWN ITEMS ====================
    console.log('🤖 No local match, falling back to AI...');

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `You are a friendly food safety expert providing quick, practical advice about food freshness and shelf life.

Item: ${cleanItemName}

Provide a helpful, conversational answer (2-3 sentences) about how long this item typically lasts and any important storage tips. Focus on practical home storage advice that consumers can easily follow.

SPECIAL ATTENTION: If this is a leftover item (like "leftover pizza", "leftover beef stew", etc.), provide guidance specific to cooked food storage - typically 3-4 days in the refrigerator.

Also determine the most likely category for this item.

Return JSON format:
{
  "name": "formatted item name",
  "category": "vegetables|fruits|meat|dairy|pantry|beverages|leftovers|bakery|frozen|other",
  "answer": "2-3 friendly sentences about shelf life and safety",
  "storageRecommendations": "brief storage tip",
  "shelfLifeDays": estimated_days_number
}

Example:
{
  "name": "Leftover Pizza",
  "category": "leftovers",
  "answer": "Leftover pizza is best enjoyed within 3-4 days when stored in the refrigerator. Make sure to wrap it well or store in an airtight container to maintain quality and prevent it from drying out.",
  "storageRecommendations": "Store in refrigerator, wrap well or use airtight container",
  "shelfLifeDays": 4
}`
        }
      ]
    });

    const content = message.content[0].text;
    console.log("Raw Claude response:", content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", content);
      return NextResponse.json(
        { error: "Could not process response. Please try again." },
        { status: 500 }
      );
    }

    const result = JSON.parse(jsonMatch[0]);
    console.log("Parsed quick answer result:", result);

    // Calculate expiry date for potential addition to list
    const today = new Date();
    const expiryDate = new Date(today);
    expiryDate.setDate(expiryDate.getDate() + (result.shelfLifeDays || 7));

    // Determine dateType based on category and item name
    const dateType = determineQuickLookupDateType(result.name, result.category);

    const enhancedResult = {
      ...result,
      purchaseDate: today.toISOString().split('T')[0],
      expiryDate: expiryDate.toISOString().split('T')[0],
      addedManually: true,
      // CRITICAL: Include dateType for safety vs quality distinction
      dateType: dateType,
      source: 'AI',
      confidence: 'medium',
    };

    return NextResponse.json(enhancedResult);

  } catch (error) {
    console.error('Error getting quick shelf life:', error);
    return NextResponse.json(
      { error: 'Failed to get shelf life information. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * Determine dateType for quick lookup results
 * High-risk foods should be marked as 'safety' dates, others as 'quality'
 */
function determineQuickLookupDateType(name, category) {
  const lowerName = (name || '').toLowerCase();
  const lowerCategory = (category || '').toLowerCase();

  // Leftovers are ALWAYS safety dates
  if (lowerName.includes('leftover') || lowerName.includes('cooked')) {
    return 'safety';
  }

  // Meat category items need further analysis
  if (lowerCategory === 'meat') {
    // Raw poultry - safety
    if (lowerName.includes('chicken') || lowerName.includes('turkey') ||
        lowerName.includes('duck') || lowerName.includes('poultry')) {
      return 'safety';
    }
    // Ground meats - safety
    if (lowerName.includes('ground')) {
      return 'safety';
    }
    // Fish and seafood - safety
    if (lowerName.includes('fish') || lowerName.includes('salmon') ||
        lowerName.includes('tuna') || lowerName.includes('shrimp') ||
        lowerName.includes('crab') || lowerName.includes('lobster') ||
        lowerName.includes('seafood') || lowerName.includes('shellfish')) {
      return 'safety';
    }
    // Raw meats - safety
    if (lowerName.includes('raw') || lowerName.includes('fresh')) {
      return 'safety';
    }
  }

  // Default to quality for all other items
  return 'quality';
}

/**
 * Format item name for display (capitalize properly)
 */
function formatItemName(name) {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Generate a friendly answer for local database matches
 */
function generateLocalAnswer(itemName, shelfDays, category, dateType) {
  const formattedName = formatItemName(itemName);
  const isSafety = dateType === 'safety';

  // Special handling for different food types
  if (isSafety) {
    if (itemName.toLowerCase().includes('leftover')) {
      return `${formattedName} should be consumed within ${shelfDays} days for food safety. Make sure to refrigerate promptly and reheat to 165°F before eating.`;
    }
    if (category === 'Meat') {
      return `${formattedName} should be cooked or frozen within ${shelfDays} days for food safety. Keep refrigerated at 40°F or below.`;
    }
    return `${formattedName} should be used within ${shelfDays} days for food safety. Store properly refrigerated.`;
  }

  // Quality dates - more relaxed language
  const timeDescription = shelfDays === 1 ? '1 day' :
                         shelfDays <= 3 ? `${shelfDays} days` :
                         shelfDays <= 7 ? 'about a week' :
                         shelfDays <= 14 ? 'about 2 weeks' :
                         `${shelfDays} days`;

  switch (category) {
    case 'Dairy':
      return `${formattedName} stays fresh for ${timeDescription} when properly refrigerated at 40°F or below. Check for off odors or texture changes before using.`;
    case 'Vegetables':
      return `${formattedName} maintains peak freshness for ${timeDescription} in the refrigerator. Store in the crisper drawer for best results.`;
    case 'Fruits':
      return `${formattedName} is best enjoyed within ${timeDescription}. Refrigerate ripe fruit to extend freshness.`;
    case 'Bakery':
      return `${formattedName} stays fresh for ${timeDescription} at room temperature. For longer storage, freeze and thaw as needed.`;
    case 'Beverages':
      return `${formattedName} is best within ${timeDescription} after opening. Keep refrigerated.`;
    default:
      return `${formattedName} maintains quality for ${timeDescription} when stored properly. Always refrigerate perishable items at 40°F or below.`;
  }
}

/**
 * Get storage recommendation based on item and category
 */
function getStorageRecommendation(name, category) {
  const lowerName = name.toLowerCase();

  // Specific item recommendations
  if (lowerName.includes('chicken') || lowerName.includes('turkey') || lowerName.includes('poultry')) {
    return 'Keep refrigerated at 40°F or below. Cook or freeze within 1-2 days.';
  }
  if (lowerName.includes('ground')) {
    return 'Keep refrigerated at 40°F or below. Cook or freeze within 1-2 days.';
  }
  if (lowerName.includes('fish') || lowerName.includes('seafood') || lowerName.includes('salmon') || lowerName.includes('shrimp')) {
    return 'Keep refrigerated at 40°F or below. Cook within 1-2 days for best quality.';
  }
  if (lowerName.includes('leftover')) {
    return 'Use within 3-4 days. Reheat to 165°F before eating.';
  }
  if (lowerName.includes('egg')) {
    return 'Keep refrigerated. Store in original carton, not the door.';
  }
  if (lowerName.includes('milk')) {
    return 'Keep refrigerated at 40°F or below. Store in back of fridge, not the door.';
  }

  // Category-based recommendations
  const categoryTips = {
    'Dairy': 'Keep refrigerated at 40°F or below.',
    'Meat': 'Keep refrigerated at 40°F or below. Freeze if not using within 2 days.',
    'Vegetables': 'Store in crisper drawer. Keep dry.',
    'Fruits': 'Refrigerate ripe fruits. Store unripe at room temperature.',
    'Bakery': 'Store at room temperature or freeze for longer storage.',
    'Beverages': 'Refrigerate after opening.',
    'Pantry': 'Store in cool, dry place.',
    'Frozen': 'Keep frozen at 0°F or below.',
    'Other': 'Refrigerate after opening.',
  };

  return categoryTips[category] || categoryTips['Other'];
}