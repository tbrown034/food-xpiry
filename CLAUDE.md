# Food Xpiry - Smart Food Waste Tracker

## Project Overview

Next.js application for tracking food expiration dates with AI-powered shelf-life estimates and storage tips. Features a distinctive "fridge door" UI metaphor.

**URL**: my-expiry.vercel.app
**GitHub**: github.com/tbrown034/food-xpiry

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Animations**: GSAP + Framer Motion (motion/react)
- **AI**: Anthropic Claude API (claude-3-5-sonnet)
  - Structured outputs, prompt caching, Vision API
- **Image Processing**: Sharp
- **Storage**: localStorage (client-side)
- **Deployment**: Vercel

```bash
npm install
npm run dev
```

---

## Architecture

### UI Metaphor: The Fridge

1. **Fridge Door** (`HomePage.js`) - Landing with sticky-note CTAs
2. **Fridge Handle** - Right side, opens to reveal contents
3. **Freezer Drawer** (`FreezerDrawer.js`) - Bottom menu with About/Stats
4. **Sticky Notes** - Yellow/blue notes for navigation

### State Management

`MainClient.js` uses consolidated state:

```javascript
// Modal state via useReducer
const [modal, dispatchModal] = useReducer(modalReducer, { type: null, data: null });

const MODAL_TYPES = {
  NONE: null, ADD_FORM: 'addForm', BATCH_POPUP: 'batchPopup',
  EDIT: 'edit', DETAIL: 'detail', CLEAR_CONFIRM: 'clearConfirm', ...
};

// Pending data for multi-step flows
const [pendingData, setPendingData] = useState({
  groceryItem: null, batchResult: null, documentResult: null,
});
```

---

## File Structure

```
food-xpiry/
├── app/
│   ├── MainClient.js           # Main orchestrator
│   ├── components/
│   │   ├── forms/              # AddGroceryForm, BatchAddGroceryForm, ReceiptUpload
│   │   ├── layout/             # Header, HeaderClient, FreezerDrawer
│   │   ├── modals/             # Modal, BatchGroceryPopup, GroceryDetailModal, EditGroceryModal
│   │   ├── pages/              # HomePage, FridgeDoor, AddToFridgePage, TypeItemsPage
│   │   ├── ui/                 # Toast, LoadingSpinner, FridgeContents, StickyNote
│   │   └── svg/                # FridgeHandle, Magnet, FrostPattern
│   └── api/
│       ├── analyze-receipt/    # Receipt/image analysis (Claude Vision)
│       ├── parse-items/        # Hybrid local + AI parsing
│       ├── get-shelf-life/     # Shelf life lookup
│       └── quick-shelf-life/   # Fast single-item lookup
├── lib/
│   ├── storage.js              # localStorage wrapper
│   ├── utils.js                # formatExpiryDate, helpers
│   ├── types.js                # Category enum
│   ├── foodEmojis.js           # Food emoji mapping
│   ├── shelfLifeDatabase.js    # Local food database (~583 items, USDA data)
│   ├── localParser.js          # Local parsing with spell correction
│   ├── motionVariants.js       # Framer Motion presets
│   └── gsapAnimations.js       # GSAP animation helpers
├── CLAUDE.md                   # This file
├── DEVLOG.md                   # Development history & test logs
└── README.md                   # Public docs
```

---

## Design Principles

1. **KISS** - Clean, minimalist design over flashy effects
2. **Progressive disclosure** - Show options only when needed
3. **Fridge metaphor** - Consistent but not overly realistic
4. **Emojis for food** - Instant recognition (functional, not decorative)

### Layout
- `100dvh` for mobile browser compatibility
- `max-w-4xl` makes fridge look like an appliance

### Animation
- GSAP: Complex coordinated animations (door, magnets)
- Framer Motion: Component transitions, hover states
- Always cleanup with `will-change: transform`

---

## Food Emoji System

**Location**: `lib/foodEmojis.js`

```javascript
getFoodEmoji(name, category) → emoji

// 1. Compound phrases first: "orange juice" → 🧃
// 2. Single keywords: "pizza" → 🍕
// 3. Category fallback: Dairy → 🥛
// 4. Default: 🍽️
```

### Adding New Foods

```javascript
// 1. Compound phrases (checked first)
const compoundPhrases = { 'orange juice': '🧃', 'ice cream': '🍦' };

// 2. Single keywords
const foodKeywords = { pizza: '🍕', chicken: '🍗', cilantro: '🌿' };

// 3. Category fallbacks
const categoryEmojis = { Dairy: '🥛', Meat: '🥩', Vegetables: '🥬' };
```

---

## API Endpoints

### `/api/parse-items` - Hybrid Local + AI Parsing

```
Input → Local DB lookup (~73% match) → AI fallback for unknown → Merged result
```

**Response**:
```typescript
{
  items: Array<{
    name: string;
    modifier?: string;
    category: Category;
    shelfLifeDays: number;
    expiryDate: string;
    source: 'local' | 'ai';
  }>;
}
```

### `/api/analyze-receipt` - Receipt Analysis

Supports: Text, CSV, Images (PNG/JPG)
PDF: Currently broken

**Features**: Rate limiting, image compression, prompt caching

---

## Known Issues

| Issue | Status | Workaround |
|-------|--------|------------|
| PDF upload | Broken | Convert to image first |
| Modifier stripping ("chicken breast" → "Chicken") | Open | Fix localParser.js |

---

## Security

All API routes validated:
- Input validation & sanitization
- Rate limiting on all AI endpoints:
  - `/api/analyze-receipt`: 10/min, 100/hour, 1000/day
  - `/api/quick-shelf-life`: 10/min, 100/hour, 500/day
  - `/api/parse-items`: 30/min, 200/hour, 1000/day
- IP-based rate limiting (not client-provided userId)
- File type/size validation (5MB max for receipts)
- Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- Filename sanitization for logging
- No SQL/shell injection vectors
- API keys in environment variables (.env.local gitignored)

---

## Food Safety Features

### Data Sources
- **USDA FoodKeeper**: Official government data (583+ items)
- **FDA Guidelines**: Safety-critical items (leftovers, raw meat)
- **AI Fallback**: For unknown items (marked with confidence level)

### Safety UI Elements
- **Fridge disclaimer**: Visible warning about quality vs. safety dates
- **Shelf life derivation**: Shows data source (USDA/FDA/AI) in item details
- **High-risk food alerts**: Red safety badges for meat, poultry, leftovers
- **Mark as Leftover**: Button to convert any item to 4-day FDA limit

### Conservative Estimates
- Leftovers capped at 4 days (FDA guideline)
- Raw poultry: 2 days max
- Ground meat: 1-2 days max
- "When in doubt, throw it out" messaging

---

## Development History

See **[DEVLOG.md](./DEVLOG.md)** for:
- Detailed changelogs by date
- Test results and matrices
- UI/UX review scores
- Bug fix documentation
- Technical recommendations

---

**Last updated**: 2026-01-13
