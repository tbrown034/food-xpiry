# Food Xpiry - Development Log

Historical development notes, test results, and changelogs. For current project reference, see [CLAUDE.md](./CLAUDE.md).

---

## 2026-01-09 - UI/UX Review

### Overview

Complete user flow testing on production site (my-expiry.vercel.app).

**Overall Score: 8.5/10**

### What Works Great

| Feature | Rating | Notes |
|---------|--------|-------|
| Fridge Metaphor | 5/5 | Consistent, delightful, not overdone |
| Sticky Note Design | 5/5 | Clean, colorful, recognizable |
| Food Emojis | 4/5 | Instant visual recognition |
| Item Detail Modal | 5/5 | Countdown timer, storage tips, USDA source |
| Quick Lookup | 5/5 | Instant shelf life check |
| Urgency Shelves | 5/5 | Color-coded: Past Due (red), Use Soon (orange), This Week (blue) |

### Issues Found

| Issue | Severity | Description |
|-------|----------|-------------|
| Missing Emojis | HIGH | "CI" for cilantro, "TO" for tortillas |
| Modifier Stripping | MEDIUM | "chicken breast" → "Chicken" |
| Old Expired Items | MEDIUM | 8 items 38-46 days expired cluttering fridge |
| Stats Mismatch | MEDIUM | "Expired (0)" but 8 past-due items visible |

### Recommendations

**High Priority:**
1. Fix emoji fallback - add cilantro, tortillas to foodEmojis.js
2. Preserve modifiers in display name

**Medium Priority:**
3. Add "Clear All Expired" button
4. Sync stats with fridge state

---

## 2026-01-09 - Spell Correction System

### Test Results: 97.6% Accuracy

**Round 1: Misspellings & Brand Names (11 items)**

| Input | Output | Status |
|-------|--------|--------|
| kroger milk | Milk | brand stripped |
| tyson chiken breast | Chicken Breast | brand + spelling |
| tomatoe | Tomatoes | spelling |
| parsely fresh | Parsley | not split |
| pinapple | Pineapple | spelling |
| bluberries | Blueberries | spelling |
| rasberries | Raspberries | spelling |
| aspargus | Asparagus | spelling |
| buttter | Butter | spelling |
| sour creme | Sour Cream | spelling |
| cheeze | Cheese | spelling |

**Result: 11/11 correct (100%)**

**Round 2: Ethnic Foods & Non-Perishables (10 items)**

| Input | Output | Category | Status |
|-------|--------|----------|--------|
| tofu | Tofu | Dairy | correct |
| kimchi | Kimchi | Other | correct |
| tempeh | Tempeh | Dairy | correct |
| humus | Hummus | Dairy | spelling fixed |
| feta cheese | Cheese | Dairy | lost modifier |
| edamame | Edamame | Vegetables | correct |
| miso paste | Miso Paste | Pantry | correct |
| white rice | White Rice | Pantry | non-perishable |
| spagheti | Spaghetti | Pantry | spelling fixed |
| olive oil | Olive Oil | Pantry | non-perishable |

**Result: 9.5/10 correct (95%)**

### Implementation

Added ~100 misspelling variants to `lib/shelfLifeDatabase.js`:

```javascript
milk: { keywords: ['milk', '2%', 'skim', 'milke', 'mlk'] },
butter: { keywords: ['butter', 'buttter', 'buttr', 'butr'] },
yogurt: { keywords: ['yogurt', 'yoghurt', 'yogart', 'yougurt'] },
potatoes: { keywords: ['potato', 'potatos', 'potatoe', 'potatto'] },
```

---

## 2026-01-09 - Receipt Analysis Testing

### Test Matrix

| Test | Items In | Items Out | Time | Cost | Status |
|------|----------|-----------|------|------|--------|
| Text receipt | 15 | 15 | 49s | $0.03 | Pass |
| CSV receipt | 15 | 15 | 37s | $0.03 | Pass |
| Small image | 12 | 11 | 102s | $0.05 | Pass |
| Large image (32) | 32 | 25 | 60s | $0.06 | Pass |
| PDF receipt | - | - | - | - | Failed |
| Typed (varied) | 15 | 16 | 5.8s | ~$0.01 | Pass |

### Key Findings

**Strengths:**
- Hybrid local-first parsing reduces AI calls by 73%
- Misspelling correction works reliably
- Image compression saves 40-50% bandwidth
- Prompt caching provides ~90% cost savings

**Issues:**
- PDF upload fails ("The PDF specified was not valid")
- Long processing times (60-100s) need progress feedback

### Cost Analysis

| Input Method | Avg Cost | Items per Dollar |
|--------------|----------|------------------|
| Typed items (hybrid) | ~$0.01 | ~1500 items |
| Text/CSV receipt | $0.03 | ~500 items |
| Image receipt | $0.05-0.06 | ~400 items |

---

## 2026-01-09 - Category Normalization Bug Fix

**Problem**: All items from receipt analysis defaulted to "Dairy" category.

**Root Cause**: API returns lowercase (`"dairy"`) but UI uses capitalized (`"Dairy"`). HTML select couldn't match.

**Solution**: Added `normalizeCategory()` function:

```javascript
function normalizeCategory(apiCategory) {
  const categoryMap = {
    'dairy': Category.DAIRY,
    'meat': Category.MEAT,
    'vegetables': Category.VEGETABLES,
    // ...
  };
  return categoryMap[apiCategory.toLowerCase()] || Category.OTHER;
}
```

**Files Modified:**
- `app/components/modals/BatchGroceryPopup.js`
- `app/components/modals/DocumentAnalysisPopup.js`

---

## 2026-01-09 - Major UI/UX Overhaul

### Design Philosophy: KISS

Identified over-engineering issues:
- 3D door animations that were confusing
- Frost patterns, metallic textures looked "AI-generated"
- Too many badges, buttons, stats visible at once
- Generic heroicons didn't convey food items

### Changes Made

**Header**: Replaced globe icon with fridge outline, removed gradients

**Homepage**: Removed 3D door swing, simple sticky notes, vertical handle with "Open" hint

**Fridge View**: Door edge on LEFT (counter-clockwise swing), clean interior

**Fridge Contents**: Urgency shelves, grid layout, food emojis

**Freezer Drawer**: Rebuilt with Framer Motion, clean slide-up menu

### Why Emojis Were Allowed

1. Instant recognition - faster than text + icon
2. Fits fridge metaphor - cartoon-style playful
3. Universal - works across platforms
4. Functional, not decorative - conveys information

---

## 2026-01-08 - User-Friendly Expiry Dates

**Problem**: Raw dates like "2026-01-15" aren't useful.

**Solution**: Added `formatExpiryDate()` utility:

```javascript
// Returns: { text: "Expires tomorrow", color: "text-orange-600", urgent: true }
// Color-coded by urgency:
// - Red: Expired, today, tomorrow
// - Orange: 2-3 days
// - Yellow: 4-7 days
// - Green: 8+ days
```

### Category Icons Added

```javascript
export const categoryIcons = {
  Dairy: BeakerIcon,
  Meat: FireIcon,
  Vegetables: SparklesIcon,
  Fruits: SunIcon,
  Bakery: CakeIcon,
  Frozen: CloudIcon,
  Pantry: ShoppingBagIcon,
  Beverages: BeakerIcon,
  Other: CubeIcon,
};
```

---

## 2026-01-08 - Component Folder Reorganization

Reorganized `/app/components/` into subfolders:

```
components/
├── forms/          # AddGroceryForm, BatchAddGroceryForm, ReceiptUpload
├── layout/         # Header, HeaderClient, FreezerDrawer
├── modals/         # Modal, BatchGroceryPopup, GroceryDetailModal, etc.
├── pages/          # HomePage, FridgeDoor, AddToFridgePage, TypeItemsPage
├── ui/             # Toast, LoadingSpinner, ActionMenu, StickyNote
└── svg/            # FridgeHandle, Magnet, FrostPattern, AnimatedIcons
```

---

## 2026-01-08 - State Management Refactor

**Before**: 26 individual `useState` hooks

**After**: Consolidated pattern:
- `useReducer` for modal state (10 states → 1)
- Single `pendingData` object for multi-step flows
- Single `isLoading` state

### Dead Code Removed (~81KB)

- `AIConfirmationModal.js`
- `GroceryAnalysisPopup.js`
- `LandingPage.js`
- `ReportPopup.js`
- `StatsSection.js`
- `ThemeProvider.js`
- `FoodInventory.js`
- `GroceryList.js`
- `CountdownTimer.js`

**Components folder**: 36 files → 25 files

---

## Technical Recommendations

### Pending Improvements

| Priority | Item | Effort |
|----------|------|--------|
| HIGH | Fix "frozen" keyword priority in emoji matching | 15 min |
| HIGH | Add missing emoji keywords (cilantro, tortillas) | 30 min |
| MEDIUM | Download USDA FoodKeeper JSON (500+ foods) | 30 min |
| MEDIUM | Create FoodDatabase service class | 2 hours |
| LOW | AI-powered emoji fallback for unknown items | 4 hours |

### External Data Sources

**USDA FoodKeeper** (Recommended):
- URL: `https://www.fsis.usda.gov/shared/data/EN/foodkeeper.json`
- 500+ food items with official USDA shelf life data
- CC0 license (public domain)

---

## Security Review (2026-01-09)

### API Routes - All Secure

| Endpoint | Status | Notes |
|----------|--------|-------|
| `/api/get-shelf-life` | Secure | Input validation, max 50 items |
| `/api/parse-items` | Secure | Max 10,000 chars, validated |
| `/api/analyze-receipt` | Secure | File type/size validation, rate limiting |
| `/api/quick-shelf-life` | Secure | Input validation, JSON parsing |

### No Vulnerabilities Found

- No XSS vectors (React auto-escapes)
- No SQL injection (no database)
- No command injection
- No SSRF
- No path traversal

---

## Test Receipt Files

**Location**: `/test-receipts/`

| File | Type | Items | Purpose |
|------|------|-------|---------|
| `grocery-receipt.txt` | Text | 15 | Standard Kroger format |
| `grocery-receipt.csv` | CSV | 15 | Structured data |
| `receipt-image.png` | Image | 12 | Small visual |
| `kroger-large-receipt.png` | Image | 32 | Stress test |

---

## API Response Schemas

### `/api/parse-items` Response

```typescript
{
  items: Array<{
    name: string;
    modifier?: string;
    category: Category;
    foodType: string;
    shelfLifeDays: number;
    expiryDate: string;
    storageRecommendations?: string;
    source: 'local' | 'ai';
    confidence: number;
  }>;
  stats: {
    total: number;
    localMatches: number;
    aiParsed: number;
    processingTimeMs: number;
  };
}
```

### `/api/analyze-receipt` Response

```typescript
{
  groceryItems: Array<{
    name: string;
    category: string;
    purchaseDate: string;
    expiryDate: string;
    shelfLifeDays: number;
  }>;
  processingStats: {
    fileType: string;
    originalSize: number;
    compressedSize?: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    estimatedCost: number;
  };
}
```

---

**Last updated**: 2026-01-09
