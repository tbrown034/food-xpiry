import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ExpiryStatus } from "../../../lib/types";
import sharp from "sharp";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY environment variable is not set");
}

// ==================== FILE VALIDATION & LIMITS ====================

const RECEIPT_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024,   // 5MB (reduced from 20MB for security)
  MAX_IMAGE_DIMENSION: 4096,         // pixels
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'text/csv',
    'text/plain'
  ]
};

const RATE_LIMITS = {
  WINDOW_MS: 60 * 1000,      // 1 minute
  MAX_REQUESTS: 10,           // 10 receipts per minute
  MAX_PER_HOUR: 100,          // 100 per hour
  MAX_PER_DAY: 1000           // 1000 per day
};

// Simple in-memory rate limiter (production: use Redis)
const rateLimits = new Map();

function getClientIP(headersList) {
  // Try various headers for client IP
  const forwardedFor = headersList.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return headersList.get('x-real-ip') || 'anonymous';
}

function validateFile(file) {
  // Size check
  if (file.size > RECEIPT_LIMITS.MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is 5MB (yours is ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
  }

  // Type check
  const isImage = RECEIPT_LIMITS.ALLOWED_IMAGE_TYPES.includes(file.type);
  const isDoc = RECEIPT_LIMITS.ALLOWED_DOCUMENT_TYPES.includes(file.type);

  if (!isImage && !isDoc) {
    throw new Error(`Invalid file type: ${file.type}. Use JPEG, PNG, PDF, or text`);
  }

  console.log(`✅ File validation passed: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
  return { isImage, isDoc };
}

function checkRateLimit(userId = 'anonymous') {
  const now = Date.now();
  const userKey = `receipt:${userId}`;

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

  // Reset hourly/daily counters BEFORE checking limits
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
    throw new Error(`Rate limit exceeded. Please wait ${resetIn} seconds before uploading more receipts.`);
  }

  if (userData.hourlyCount >= RATE_LIMITS.MAX_PER_HOUR) {
    const resetIn = Math.ceil((userData.hourReset - now) / 1000 / 60);
    throw new Error(`Hourly limit reached (${RATE_LIMITS.MAX_PER_HOUR} receipts). Please try again in ${resetIn} minutes.`);
  }

  if (userData.dailyCount >= RATE_LIMITS.MAX_PER_DAY) {
    const hoursUntilReset = Math.ceil((userData.dayReset - now) / 1000 / 60 / 60);
    throw new Error(`Daily limit reached (${RATE_LIMITS.MAX_PER_DAY} receipts). Please try again in ${hoursUntilReset} hours.`);
  }

  // Add current request
  userData.requests.push(now);
  userData.hourlyCount++;
  userData.dailyCount++;

  console.log(`✅ Rate limit OK: ${RATE_LIMITS.MAX_REQUESTS - userData.requests.length} remaining this minute`);

  return {
    remaining: RATE_LIMITS.MAX_REQUESTS - userData.requests.length,
    resetAt: userData.hourReset
  };
}

async function compressReceiptImage(imageBuffer, mediaType) {
  const TARGET_HEIGHT = 1200; // Good balance for receipt OCR
  const JPEG_QUALITY = 85;    // High quality, good compression

  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    console.log(`📐 Original image: ${metadata.width}x${metadata.height} (${(imageBuffer.length / 1024).toFixed(1)}KB)`);

    // Resize if too large
    let processedImage = image;
    if (metadata.height > TARGET_HEIGHT) {
      processedImage = image.resize(null, TARGET_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true
      });
      console.log(`📏 Resizing to max height: ${TARGET_HEIGHT}px`);
    }

    // Convert to JPEG for better compression
    const compressed = await processedImage
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    const compressionRatio = ((imageBuffer.length - compressed.length) / imageBuffer.length * 100).toFixed(1);
    console.log(`✅ Compressed: ${(compressed.length / 1024).toFixed(1)}KB (${compressionRatio}% smaller)`);

    return {
      data: compressed.toString('base64'),
      mediaType: 'image/jpeg',
      originalSize: imageBuffer.length,
      compressedSize: compressed.length,
      compressionRatio: parseFloat(compressionRatio)
    };

  } catch (error) {
    console.error('⚠️ Compression failed, using original:', error.message);
    return {
      data: imageBuffer.toString('base64'),
      mediaType,
      originalSize: imageBuffer.length,
      compressedSize: imageBuffer.length,
      compressionRatio: 0
    };
  }
}

function logAPIUsage(file, message, compressed = null) {
  const usage = {
    timestamp: new Date().toISOString(),
    fileType: file.type,
    fileName: file.name,
    originalSize: file.size,
    compressedSize: compressed?.compressedSize,
    inputTokens: message.usage?.input_tokens || 0,
    outputTokens: message.usage?.output_tokens || 0,
    cacheReadTokens: message.usage?.cache_read_input_tokens || 0,
    cacheCreationTokens: message.usage?.cache_creation_input_tokens || 0,
    thinkingTokens: message.usage?.thinking_tokens || 0
  };

  // Calculate estimated cost (Claude Sonnet 4.5 pricing Nov 2025)
  const INPUT_COST = 3 / 1000000;   // $3 per 1M tokens
  const OUTPUT_COST = 15 / 1000000; // $15 per 1M tokens
  const CACHE_COST = 0.3 / 1000000; // $0.30 per 1M tokens (90% discount)

  const cost = (
    (usage.inputTokens * INPUT_COST) +
    (usage.outputTokens * OUTPUT_COST) +
    (usage.cacheReadTokens * CACHE_COST)
  );

  usage.estimatedCost = parseFloat(cost.toFixed(6));
  usage.compressionSavings = compressed
    ? `${compressed.compressionRatio}%`
    : 'N/A';

  console.log('💰 API Usage:', JSON.stringify(usage, null, 2));

  return usage;
}

// ==================== SMART PRE-PROCESSING ====================

/**
 * Detects if content looks like Kroger or similar web copy-paste
 */
function looksLikeWebCopyPaste(content) {
  const webIndicators = [
    /Skip to content/i,
    /©\d{4}/,
    /Privacy Policy/i,
    /Terms and Conditions/i,
    /Follow us on/i,
    /Facebook site logo/i,
    /All Rights Reserved/i,
    /Digital Coupons/i,
    /Weekly Ad/i,
    /Store Locator/i,
  ];

  let matches = 0;
  for (const pattern of webIndicators) {
    if (pattern.test(content)) {
      matches++;
    }
  }

  // If 3+ web indicators found, it's probably a web copy-paste
  return matches >= 3;
}

/**
 * Cleans Kroger and similar grocery website copy-paste content
 */
function cleanWebReceiptContent(content) {
  console.log("🧹 Cleaning web receipt copy-paste content...");

  let cleaned = content;

  // Remove common header/navigation sections
  cleaned = cleaned.replace(/^.*?(?=Purchase Details|In-store|Order Details|Items)/is, '');

  // Remove footer content (everything after payment summary or last item)
  cleaned = cleaned.replace(/(?:ABOUT US|GET THE APP|Let's Connect|All Contents ©)[\s\S]*$/i, '');

  // Remove navigation links and buttons
  cleaned = cleaned.replace(/Skip to content[\s\S]*?(?=Purchase|In-store)/i, '');
  cleaned = cleaned.replace(/Digital Coupons|Weekly Ad|Meal Planning|Store Locator|Breadcrumb/gi, '');
  cleaned = cleaned.replace(/Home(?:Purchase History)?Purchase Details/i, 'Purchase Details');

  // Remove social media and legal links
  cleaned = cleaned.replace(/(?:X|Facebook|YouTube|Pinterest|Instagram) site logo/gi, '');
  cleaned = cleaned.replace(/Privacy Policy|Terms and Conditions|HIPAA Notice/gi, '');
  cleaned = cleaned.replace(/Financial Products.*?Privacy Policy/is, '');

  // Remove survey/marketing content
  cleaned = cleaned.replace(/Review your experience.*?Take Survey.*?(?:\n|$)/gi, '');
  cleaned = cleaned.replace(/\(Opens in a new tab or window\)/gi, '');

  // Remove redundant whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();

  console.log(`✅ Cleaned content: ${content.length} → ${cleaned.length} characters`);

  return cleaned;
}

// ==================== JSON SCHEMA FOR STRUCTURED OUTPUTS ====================

const RECEIPT_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      description: "List of grocery items found in the receipt",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Simple, generic food name (e.g., 'milk' not 'Kroger 2% Milk')"
          },
          originalName: {
            type: "string",
            description: "Original product name from receipt"
          },
          isPerishable: {
            type: "boolean",
            description: "true if needs refrigeration or has short shelf life. Beer, soda, canned goods = false. Fresh produce, dairy, meat, prepared foods = true. Fruit juice = true, beer = false."
          },
          foodType: {
            type: "string",
            enum: ["store-bought", "premade", "skip"],
            description: "store-bought: packaged raw/processed foods. premade: deli/prepared ready-to-eat items (sandwiches, salads, rotisserie chicken). skip: non-food or non-perishable beverages (beer, soda, supplements, household items)"
          },
          category: {
            type: "string",
            enum: ["dairy", "meat", "vegetables", "fruits", "bakery", "frozen", "pantry", "beverages", "other"],
            description: "Food category"
          },
          shelfLifeDays: {
            type: "number",
            description: "Days from purchase until food goes bad. Premade items: max 3-4 days. Store-bought: typical shelf life."
          },
          quantity: {
            type: "number",
            description: "Number of items purchased (default 1)"
          },
          price: {
            type: ["number", "null"],
            description: "Price paid in dollars, or null if not found"
          },
          storageRecommendations: {
            type: "string",
            description: "Brief home storage tips"
          }
        },
        required: ["name", "isPerishable", "foodType", "category", "shelfLifeDays", "quantity"],
        additionalProperties: false
      }
    },
    storeName: {
      type: ["string", "null"],
      description: "Store/merchant name (e.g., 'Kroger', 'Walmart', 'Target'), or null if not found"
    },
    receiptDate: {
      type: ["string", "null"],
      description: "Receipt date in YYYY-MM-DD format, or null if not found"
    },
    totalItems: {
      type: "number",
      description: "Total number of items analyzed (before filtering)"
    },
    skippedItems: {
      type: "array",
      description: "Names of non-food or non-perishable items that were skipped",
      items: { type: "string" }
    },
    summary: {
      type: "string",
      description: "Brief summary of what was found"
    }
  },
  required: ["items", "storeName", "receiptDate", "totalItems", "skippedItems", "summary"],
  additionalProperties: false
};

// ==================== CACHED SYSTEM PROMPT ====================

const PERISHABLE_EXPERT_SYSTEM_PROMPT = `You are a food safety and grocery tracking expert helping users manage perishable foods.

Your job is to analyze receipts and extract ONLY perishable food items that need tracking.

## KEY RULES:

### What IS Perishable (track these):
- Fresh produce (fruits, vegetables)
- Dairy products (milk, cheese, yogurt)
- Fresh meat, poultry, seafood
- Deli/prepared foods (sandwiches, salads, rotisserie chicken)
- Bakery items (bread, pastries)
- Fresh juices and smoothies
- Opened or prepared foods

### What is NOT Perishable (skip these):
- Beer, wine, spirits (alcoholic beverages)
- Soda, energy drinks, sports drinks
- Canned goods (unless opened)
- Dry pantry items (pasta, rice, cereal - unless opened)
- Supplements, vitamins, medications
- Household items, personal care
- Frozen items (track only if user indicates they'll thaw soon)

### Food Type Classification:

**"store-bought"**: Packaged items from grocery shelves
- Packaged milk, cheese, yogurt
- Pre-packaged deli meats and cheeses
- Frozen pizzas (if tracking)
- Store-brand packaged items
- Shelf life: Use typical package dates

**"premade"**: Store-prepared ready-to-eat items
- Deli sandwiches, wraps, salads
- Rotisserie chicken
- Fresh sushi
- Store-made meals from hot bar or deli counter
- Shelf life: Maximum 3-4 days regardless of package

**"skip"**: Do not track
- All non-food items
- Non-perishable beverages (beer, soda)
- Supplements and medications
- Shelf-stable pantry items

### Shelf Life Guidelines:
- Premade deli items: 3-4 days maximum
- Fresh milk: 5-7 days
- Fresh produce: varies (berries 3-5 days, apples 7-10 days)
- Fresh meat: 1-3 days (beef 3 days, ground meat 1-2 days, chicken 1-2 days)
- Deli cheese/meat (packaged): 5-7 days unopened
- Bread: 3-5 days

### Important:
- Convert brand names to generic food names (Kroger Milk → milk)
- If uncertain whether something is perishable, err on the side of tracking it
- Extract quantities when mentioned (e.g., "2 lbs" = quantity: 2)
- Extract prices when visible
- Look for purchase/receipt dates
- Extract store/merchant name (Kroger, Walmart, Target, etc.)

Be thorough but conservative - only track what truly needs monitoring.`;

// ==================== HELPER FUNCTIONS ====================

function getExpiryStatus(expiryDate) {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return ExpiryStatus.EXPIRED;
  } else if (daysUntilExpiry <= 3) {
    return ExpiryStatus.EXPIRING_SOON;
  } else {
    return ExpiryStatus.FRESH;
  }
}

/**
 * Formats content for AI analysis based on file type
 */
function formatReceiptPrompt(content, fileType) {
  if (fileType?.startsWith('image/') || fileType === 'application/pdf') {
    return `Analyze this receipt ${fileType === 'application/pdf' ? 'document' : 'image'} and extract all perishable grocery items.

Extract:
- Item names (convert to simple generic names)
- Quantities purchased
- Prices if visible
- Receipt date if visible

Focus on perishable items only. Skip beer, soda, supplements, and household items.`;
  }

  return `Analyze this receipt and extract all perishable grocery items.

Receipt content:
${content}

Extract:
- Item names (convert to simple generic names)
- Quantities purchased
- Prices if visible
- Receipt date if visible

Focus on perishable items only. Skip beer, soda, supplements, and household items.`;
}

/**
 * Extracts content from uploaded file
 */
async function extractFileContent(file) {
  if (file.type === "application/pdf") {
    console.log("📄 Processing PDF file...");
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`✅ PDF ready for Claude (${(buffer.length / 1024).toFixed(1)}KB)`);
    return {
      content: buffer.toString('base64'),
      type: 'pdf',
      mediaType: 'application/pdf'
    };

  } else if (file.type.startsWith("image/")) {
    console.log("🖼️ Processing image file...");
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Compress image for cost savings
    const compressed = await compressReceiptImage(buffer, file.type);

    return {
      content: compressed.data,
      type: 'image',
      mediaType: compressed.mediaType,
      compressed: compressed
    };

  } else if (file.type === "text/csv" || file.name.endsWith(".csv")) {
    console.log("📊 Processing CSV file...");
    const csvText = await file.text();
    return { content: csvText, type: 'text' };

  } else {
    console.log("📝 Processing text file...");
    const textContent = await file.text();

    if (!textContent.trim()) {
      throw new Error("File appears to be empty");
    }

    return { content: textContent, type: 'text' };
  }
}

// ==================== MAIN API ROUTE ====================

export async function POST(request) {
  try {
    console.log("🚀 Starting optimized receipt analysis with safeguards...");

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY is missing");
      return NextResponse.json(
        { error: "API configuration error" },
        { status: 500 }
      );
    }

    // Get client IP for rate limiting (more secure than client-provided userId)
    const headersList = await headers();
    const clientIP = getClientIP(headersList);

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      console.error("No file provided in request");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Sanitize filename for logging (prevent log injection)
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
    console.log(`📄 File: ${safeFileName} (${file.size} bytes, ${file.type})`);

    // ==================== VALIDATION & RATE LIMITING ====================

    // Step 1: Validate file size and type
    try {
      validateFile(file);
    } catch (validationError) {
      console.error("❌ Validation failed:", validationError.message);
      return NextResponse.json(
        { error: validationError.message },
        { status: 400 }
      );
    }

    // Step 2: Check rate limits (using IP, not client-provided userId)
    try {
      checkRateLimit(clientIP);
    } catch (rateLimitError) {
      console.error("❌ Rate limit exceeded:", rateLimitError.message);
      return NextResponse.json(
        { error: rateLimitError.message },
        { status: 429 }
      );
    }

    // ==================== STEP 1: EXTRACT CONTENT ====================
    let extractedData;
    try {
      extractedData = await extractFileContent(file);
    } catch (extractError) {
      console.error("❌ File extraction error:", extractError);
      return NextResponse.json(
        {
          error: "Failed to extract content from file",
          details: extractError.message,
        },
        { status: 400 }
      );
    }

    // ==================== STEP 2: SMART PRE-PROCESSING ====================
    let content = extractedData.content;
    let wasPreprocessed = false;

    if (extractedData.type === 'text' && looksLikeWebCopyPaste(content)) {
      console.log("🔍 Detected web copy-paste (Kroger-style)");
      content = cleanWebReceiptContent(content);
      wasPreprocessed = true;
    }

    // ==================== STEP 3: AI ANALYSIS WITH ADVANCED FEATURES ====================
    console.log("🤖 AI TRIP: Starting Claude API analysis with structured outputs + caching + extended thinking");

    let messageConfig = {
      model: "claude-sonnet-4-5-20250929", // Latest model
      max_tokens: 8000,

      // PROMPT CACHING - saves ~90% on repeated calls
      system: [
        {
          type: "text",
          text: PERISHABLE_EXPERT_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" }
        }
      ],

      // EXTENDED THINKING - better accuracy for ambiguous items
      thinking: {
        type: "enabled",
        budget_tokens: 4000
      },

      // STRUCTURED OUTPUTS - guaranteed valid JSON
      output_format: {
        type: "json_schema",
        schema: RECEIPT_ANALYSIS_SCHEMA
      },

      messages: []
    };

    // Build message content based on file type
    if (extractedData.type === 'image') {
      messageConfig.messages = [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: extractedData.mediaType,
              data: content
            }
          },
          {
            type: "text",
            text: formatReceiptPrompt(content, file.type)
          }
        ]
      }];
    } else if (extractedData.type === 'pdf') {
      messageConfig.messages = [{
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: extractedData.mediaType,
              data: content
            }
          },
          {
            type: "text",
            text: formatReceiptPrompt(content, file.type)
          }
        ]
      }];
    } else {
      messageConfig.messages = [{
        role: "user",
        content: formatReceiptPrompt(content, file.type)
      }];
    }

    let message;
    try {
      message = await anthropic.beta.messages.create({
        ...messageConfig,
        betas: ["pdfs-2024-09-25", "structured-outputs-2025-11-13"]
      });
      console.log("✅ AI TRIP: Completed analysis");
      console.log(`💭 Thinking tokens used: ${message.usage?.thinking_tokens || 0}`);
      console.log(`📊 Cache usage: ${message.usage?.cache_read_input_tokens || 0} cached tokens read`);
    } catch (aiError) {
      console.error("❌ AI API error:", aiError);
      return NextResponse.json(
        {
          error: "Failed to process receipt with AI",
          details: aiError.message,
        },
        { status: 500 }
      );
    }

    // ==================== STEP 4: PARSE STRUCTURED OUTPUT ====================
    let analysisResult;
    try {
      // With structured outputs, we get guaranteed valid JSON
      const responseText = message.content?.find(block => block.type === 'text')?.text;

      if (!responseText) {
        throw new Error("No text content in AI response");
      }

      analysisResult = JSON.parse(responseText);
      console.log(`📦 Parsed result: ${analysisResult.totalItems} total items, ${analysisResult.items.length} perishable items`);
    } catch (parseError) {
      console.error("❌ Failed to parse AI response:", parseError);
      return NextResponse.json(
        {
          error: "Failed to parse AI response",
          details: parseError.message,
        },
        { status: 500 }
      );
    }

    // ==================== STEP 5: FILTER & PROCESS PERISHABLE ITEMS ====================
    console.log("🔍 Filtering to perishable items only...");

    const perishableItems = analysisResult.items.filter(
      item => item.isPerishable && item.foodType !== "skip"
    );

    console.log(`✅ Found ${perishableItems.length} perishable items (skipped ${analysisResult.skippedItems?.length || 0} non-perishables)`);

    // Process items for frontend
    const processedItems = perishableItems.map(item => {
      const purchaseDate = analysisResult.receiptDate || new Date().toISOString().split("T")[0];

      // Apply shelf life rules
      let shelfLifeDays = item.shelfLifeDays;

      // Cap premade items at 4 days max
      if (item.foodType === "premade") {
        shelfLifeDays = Math.min(shelfLifeDays, 4);
      }

      // Calculate expiry date
      const expiryDate = new Date(purchaseDate);
      expiryDate.setDate(expiryDate.getDate() + shelfLifeDays);
      const expiryDateString = expiryDate.toISOString().split("T")[0];

      const daysUntilExpiry = Math.ceil(
        (new Date(expiryDateString) - new Date()) / (1000 * 60 * 60 * 24)
      );

      // Determine dateType based on category and foodType
      const dateType = determineReceiptDateType(item.name, item.category, item.foodType);

      return {
        name: item.name,
        originalName: item.originalName || item.name,
        category: item.category,
        foodType: item.foodType,
        purchaseDate,
        expiryDate: expiryDateString,
        shelfLifeDays,
        daysUntilExpiry,
        quantity: item.quantity || 1,
        price: item.price || null,
        addedManually: false,
        status: getExpiryStatus(expiryDateString),
        storageRecommendations: item.storageRecommendations || null,
        // CRITICAL: Include dateType for safety vs quality distinction
        dateType: dateType,
      };
    });

    // ==================== STEP 6: RETURN RESULTS ====================
    console.log(`✅ Successfully processed receipt: ${processedItems.length} perishable items ready`);

    // Get usage stats for response
    const usageStats = logAPIUsage(file, message, extractedData.compressed);

    return NextResponse.json({
      analysis: analysisResult.summary,
      groceryItems: processedItems,
      itemsFound: processedItems.length,
      receiptDate: analysisResult.receiptDate,
      storeName: analysisResult.storeName,
      summary: analysisResult.summary,
      skippedItems: analysisResult.skippedItems || [],
      totalItemsAnalyzed: analysisResult.totalItems,
      batchMetadata: {
        source: 'receipt',
        storeName: analysisResult.storeName,
        uploadedAt: new Date().toISOString()
      },
      optimizations: {
        promptCaching: true,
        extendedThinking: true,
        structuredOutputs: true,
        smartPreProcessing: wasPreprocessed,
        imageCompression: extractedData.compressed ? true : false,
        nativePdfSupport: extractedData.type === 'pdf'
      },
      meta: {
        tokensUsed: usageStats.inputTokens + usageStats.outputTokens,
        estimatedCost: `$${usageStats.estimatedCost}`,
        compressionSavings: usageStats.compressionSavings,
        cacheHit: usageStats.cacheReadTokens > 0,
        fileSize: {
          original: `${(file.size / 1024).toFixed(1)}KB`,
          compressed: extractedData.compressed ? `${(extractedData.compressed.compressedSize / 1024).toFixed(1)}KB` : 'N/A'
        }
      }
    });

  } catch (error) {
    console.error("❌ Unexpected error analyzing receipt:", error);
    console.error("Stack:", error.stack);
    return NextResponse.json(
      {
        error: "Failed to analyze receipt",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Determine dateType for receipt items
 * High-risk foods should be marked as 'safety' dates, others as 'quality'
 */
function determineReceiptDateType(name, category, foodType) {
  const lowerName = (name || '').toLowerCase();
  const lowerCategory = (category || '').toLowerCase();
  const lowerFoodType = (foodType || '').toLowerCase();

  // Premade and leftover items are ALWAYS safety dates
  if (lowerFoodType === 'premade' || lowerFoodType === 'leftover') {
    return 'safety';
  }

  // Leftovers in name
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
        lowerName.includes('seafood') || lowerName.includes('shellfish') ||
        lowerName.includes('tilapia') || lowerName.includes('cod')) {
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
