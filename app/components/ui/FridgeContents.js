'use client';

import { useMemo, useState } from 'react';
import { getFoodEmoji, getCategoryBgColor } from '../../../lib/foodEmojis';

export default function FridgeContents({
  groceries,
  onItemClick,
  onMarkAsEaten,
  onDeleteItem,
}) {
  // State for clear all confirmation
  const [clearConfirm, setClearConfirm] = useState({ show: false, shelfName: '', items: [] });

  // Group identical items (same name + expiry date) and sum their quantities
  const groupItems = (items) => {
    const grouped = new Map();
    items.forEach(item => {
      const key = `${item.name.toLowerCase()}-${item.expiryDate}`;
      const itemQty = item.quantity || 1; // Default to 1 for backwards compatibility
      if (grouped.has(key)) {
        const existing = grouped.get(key);
        existing.quantity += itemQty;
        existing.ids.push(item.id);
      } else {
        grouped.set(key, {
          ...item,
          quantity: itemQty,
          ids: [item.id],
        });
      }
    });
    return Array.from(grouped.values());
  };

  // Group items by urgency for the 3 shelves (exclude eaten items - they go to history page)
  const { expired, useSoon, thisWeek, crisper } = useMemo(() => {
    const activeItems = groceries.filter(i => !i.eaten);
    const sorted = [...activeItems].sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    return {
      // Expired: past due items (daysUntilExpiry < 0)
      expired: groupItems(sorted.filter(i => i.daysUntilExpiry < 0)),
      // Use Soon: today through 3 days (0-3)
      useSoon: groupItems(sorted.filter(i => i.daysUntilExpiry >= 0 && i.daysUntilExpiry <= 3)),
      // This Week: 4-7 days
      thisWeek: groupItems(sorted.filter(i => i.daysUntilExpiry > 3 && i.daysUntilExpiry <= 7)),
      // Crisper: more than a week
      crisper: groupItems(sorted.filter(i => i.daysUntilExpiry > 7)),
    };
  }, [groceries]);

  // Count total expired items for the clear all button
  const expiredCount = expired.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // Handle clear all expired
  const handleClearAllExpired = () => {
    setClearConfirm({ show: true, shelfName: 'All Expired Items', items: expired });
  };

  // Get display text for expiry - shows remaining freshness or safety
  // Uses dateType to distinguish quality dates vs safety dates
  const getDaysText = (item) => {
    if (item.eaten) return 'Eaten';
    const days = item.daysUntilExpiry;
    const isSafety = item.dateType === 'safety';

    if (days < 0) {
      const daysAgo = Math.abs(days);
      // Safety items get warning indicator
      return isSafety
        ? `⚠️ ${daysAgo}d over`
        : (daysAgo === 1 ? 'Expired 1d' : `Expired ${daysAgo}d`);
    }
    if (days === 0) return isSafety ? 'Use today!' : 'Use today';
    if (days === 1) return isSafety ? '1d left' : '1d fresh';
    return isSafety ? `${days}d left` : `${days}d fresh`;
  };

  // Get urgency styles - softer, less alarming colors
  const getUrgencyStyle = (item) => {
    if (item.eaten) return { badge: 'text-emerald-700 bg-emerald-100/90', glow: '' };
    if (item.daysUntilExpiry < 0) return { badge: 'text-orange-700 bg-orange-100/90', glow: '' };
    if (item.daysUntilExpiry <= 3) return { badge: 'text-amber-700 bg-amber-100/90', glow: '' };
    if (item.daysUntilExpiry <= 7) return { badge: 'text-sky-700 bg-sky-100/90', glow: '' };
    return { badge: 'text-emerald-600 bg-emerald-50/90', glow: '' };
  };

  // Food item - sits on the shelf
  const FoodItem = ({ item }) => {
    const [showActions, setShowActions] = useState(false);
    // Pass whole item for more accurate emoji matching (uses matchedKey if available)
    const emoji = getFoodEmoji(item);
    const urgencyStyle = getUrgencyStyle(item);
    const quantity = item.quantity || 1;

    // Use first id from grouped items
    const handleEat = (e) => {
      e.stopPropagation();
      const id = item.ids ? item.ids[0] : item.id;
      onMarkAsEaten?.(id);
      setShowActions(false);
    };

    const handleDelete = (e) => {
      e.stopPropagation();
      const id = item.ids ? item.ids[0] : item.id;
      onDeleteItem?.(id);
      setShowActions(false);
    };

    const handleItemClick = (e) => {
      // Toggle action buttons on tap, or open detail on second tap
      if (!item.eaten) {
        if (showActions) {
          // Second tap opens detail modal
          onItemClick(item);
        } else {
          // First tap shows action buttons
          setShowActions(true);
        }
      } else {
        onItemClick(item);
      }
    };

    // Close actions when clicking elsewhere
    const handleBlur = () => {
      setTimeout(() => setShowActions(false), 200);
    };

    return (
      <div
        onClick={handleItemClick}
        onMouseEnter={() => !item.eaten && setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onBlur={handleBlur}
        className="relative flex flex-col items-center cursor-pointer group"
        tabIndex={0}
      >
        {/* Action buttons - always accessible, smooth reveal */}
        {!item.eaten && (
          <div
            className={`
              absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-30
              transition-all duration-300 ease-in-out
              ${showActions ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}
            `}
          >
            <button
              onClick={handleEat}
              className="w-8 h-8 rounded-full bg-emerald-500/90 hover:bg-emerald-600 text-white flex items-center justify-center shadow-md transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 cursor-pointer"
              title="Mark as eaten"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="w-8 h-8 rounded-full bg-slate-400/90 hover:bg-rose-500 text-white flex items-center justify-center shadow-md transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 cursor-pointer"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* The food emoji - sitting on shelf */}
        <div className={`
          relative transition-all duration-300 ease-in-out
          ${showActions && !item.eaten ? '-translate-y-1' : ''}
          ${item.eaten ? 'opacity-40 grayscale' : ''}
        `}>
          {/* Emoji with subtle shadow */}
          <span
            className="text-3xl sm:text-4xl block transition-all duration-300 ease-in-out"
            style={{
              filter: showActions
                ? 'drop-shadow(0 3px 6px rgba(0,0,0,0.12))'
                : 'drop-shadow(0 2px 3px rgba(0,0,0,0.08))'
            }}
          >
            {emoji}
          </span>

          {/* Quantity badge */}
          {quantity > 1 && (
            <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-slate-700 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-md ring-1 ring-white/20">
              {quantity}
            </div>
          )}

          {/* Reflection on shelf surface */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-gradient-to-b from-black/5 to-transparent rounded-full blur-sm" />
        </div>

        {/* Label below food */}
        <div className="mt-1.5 text-center transition-opacity duration-300 ease-in-out opacity-90">
          <span className={`
            text-[10px] sm:text-[11px] font-medium leading-tight block
            ${item.eaten ? 'line-through text-slate-400' : 'text-slate-700'}
          `}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            maxWidth: '60px',
          }}>
            {item.name}
          </span>
          <span className={`
            text-[9px] sm:text-[10px] font-bold mt-0.5 px-1.5 py-0.5 rounded-full inline-block
            ${urgencyStyle.badge}
          `}>
            {getDaysText(item)}
          </span>
          {/* Source indicator - shows where data came from */}
          {item.source && !item.eaten && (
            <span className={`
              block text-[7px] mt-0.5 font-medium
              ${item.source === 'AI' ? 'text-purple-500' :
                item.source === 'default' || item.source === 'USDA Food Safety Guidelines' ? 'text-orange-400' :
                'text-slate-400'}
            `}>
              {item.source === 'USDA' ? '✓ USDA' :
               item.source === 'FDA' ? '✓ FDA' :
               item.source === 'AI' ? '🤖 AI' :
               item.source === 'default' || item.source === 'USDA Food Safety Guidelines' ? '⚠️ est.' :
               item.source}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Show confirmation before clearing a shelf
  const handleClearAllClick = (shelfName, items) => {
    setClearConfirm({ show: true, shelfName, items });
  };

  // Actually delete all items after confirmation
  const handleConfirmClearAll = () => {
    clearConfirm.items.forEach(item => {
      const ids = item.ids || [item.id];
      ids.forEach(id => onDeleteItem?.(id));
    });
    setClearConfirm({ show: false, shelfName: '', items: [] });
  };

  // Cancel clear all
  const handleCancelClearAll = () => {
    setClearConfirm({ show: false, shelfName: '', items: [] });
  };

  // Glass shelf with realistic 3D appearance - always shows even when empty
  const GlassShelf = ({ title, subtitle, items, accentColor = 'bg-slate-400' }) => {
    // Count total items including quantities
    const totalCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const isEmpty = items.length === 0;

    return (
      <div className="relative mb-1">
        {/* Shelf header - clean, minimal design */}
        <div className="flex items-center justify-between px-4 pt-2 pb-1">
          <div className="flex items-center gap-2.5">
            {/* Accent bar */}
            <div className={`w-1 h-8 rounded-full ${accentColor}`} />

            {/* Text */}
            <div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-base font-semibold text-slate-700 tracking-tight">{title}</h3>
                <span className="text-sm font-medium text-slate-400">{totalCount}</span>
              </div>
              {subtitle && (
                <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Clear button - only show if items exist */}
          {!isEmpty && (
            <button
              onClick={() => handleClearAllClick(title, items)}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Food items sitting on shelf */}
        <div className="pt-8 pb-2 px-4">
          {isEmpty ? (
            <div className="flex items-center justify-center min-h-[40px] text-slate-400 text-sm">
              No items
            </div>
          ) : (
            <div className="flex flex-wrap gap-x-4 gap-y-10 sm:gap-x-5 sm:gap-y-12 justify-start items-end min-h-[60px]">
              {items.map(item => (
                <FoodItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Glass shelf surface - the actual shelf */}
        <div className="relative mx-2">
          {/* Shelf top surface - glass with subtle blue tint */}
          <div className="h-3 relative">
            {/* Glass gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-100/40 via-white/60 to-cyan-50/30 rounded-t-sm" />
            {/* Shine line */}
            <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
            {/* Front edge highlight */}
            <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-slate-300/50 via-slate-200/70 to-slate-300/50" />
          </div>

          {/* Shelf front edge - 3D depth */}
          <div className="h-2 bg-gradient-to-b from-slate-300/80 via-slate-200/60 to-slate-100/40 rounded-b-sm shadow-sm" />

          {/* Chrome bracket hints on sides */}
          <div className="absolute -left-1 top-0 w-2 h-full bg-gradient-to-r from-slate-400/60 to-transparent rounded-l" />
          <div className="absolute -right-1 top-0 w-2 h-full bg-gradient-to-l from-slate-400/60 to-transparent rounded-r" />
        </div>
      </div>
    );
  };

  // Crisper drawer at the bottom - always shows
  const CrisperDrawer = ({ items }) => {
    // Count total items including quantities
    const totalCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const isEmpty = items.length === 0;

    return (
      <div className="relative mx-2 mt-2">
        {/* Drawer header - clean, minimal design */}
        <div className="flex items-center justify-between px-2 mb-2">
          <div className="flex items-center gap-2.5">
            {/* Accent bar */}
            <div className="w-1 h-8 rounded-full bg-emerald-500" />

            {/* Text */}
            <div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-base font-semibold text-slate-700 tracking-tight">Fresh & Long-lasting</h3>
                <span className="text-sm font-medium text-slate-400">{totalCount}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">More than a week</p>
            </div>
          </div>

          {/* Clear button - only show if items exist */}
          {!isEmpty && (
            <button
              onClick={() => handleClearAllClick('Fresh & Long-lasting', items)}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Drawer container */}
        <div className="relative">
          {/* Drawer body - translucent plastic look */}
          <div className="pt-4 pb-3 px-4 bg-gradient-to-b from-emerald-50/50 via-white/40 to-emerald-50/30 rounded-xl border border-slate-200/50 shadow-inner backdrop-blur-sm">
            {/* Inner frost texture */}
            <div className="absolute inset-0 rounded-xl opacity-30 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(255,255,255,0.6) 0%, transparent 40%)'
              }}
            />

            {isEmpty ? (
              <div className="relative flex items-center justify-center min-h-[40px] text-slate-400 text-sm">
                No items
              </div>
            ) : (
              <div className="relative flex flex-wrap gap-x-4 gap-y-10 sm:gap-x-5 sm:gap-y-12 justify-start items-end min-h-[60px]">
                {items.map(item => (
                  <FoodItem key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>

          {/* Drawer bottom edge */}
          <div className="h-2 bg-gradient-to-b from-slate-200/60 to-slate-300/40 rounded-b-xl shadow-sm" />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-full pb-4 relative">
      {/* Fridge interior background - cool white with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-100/80 pointer-events-none" />

      {/* Fridge interior light effect - brighter at top */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(ellipse 100% 40% at 50% 0%, rgba(255,255,255,0.9) 0%, transparent 70%)'
        }}
      />

      {/* Subtle frost texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L30 60M0 30L60 30M10 10L50 50M50 10L10 50' stroke='%23e2e8f0' stroke-width='0.5' fill='none'/%3E%3C/svg%3E")`,
          backgroundSize: '30px 30px'
        }}
      />

      {/* Clear All Expired Banner - shows when there are expired items */}
      {expiredCount > 0 && (
        <div className="relative mx-2 mt-2 mb-1">
          <button
            onClick={handleClearAllExpired}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 rounded-xl text-white shadow-lg transition-all active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="text-left">
                <span className="font-semibold text-sm">
                  {expiredCount} Expired Item{expiredCount !== 1 ? 's' : ''}
                </span>
                <p className="text-white/80 text-xs">Tap to clear all</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}

      {/* Shelves */}
      <div className="relative pt-2">
        {/* Expired - only shows if there are expired items */}
        {expired.length > 0 && (
          <GlassShelf
            title="Expired"
            subtitle="Past due"
            items={expired}
            accentColor="bg-red-500"
          />
        )}

        {/* Use Soon - top shelf */}
        <GlassShelf
          title="Use Soon"
          subtitle="Within 3 days"
          items={useSoon}
          accentColor="bg-amber-500"
        />

        {/* This Week */}
        <GlassShelf
          title="This Week"
          subtitle="4-7 days"
          items={thisWeek}
          accentColor="bg-sky-500"
        />

        {/* Crisper Drawer - bottom for fresh items */}
        <CrisperDrawer items={crisper} />

        {/* Food Safety Disclaimer */}
        <div className="mx-4 mt-4 mb-2 p-3 bg-amber-50/80 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 text-sm">⚠️</span>
            <div className="text-xs text-amber-700">
              <p className="font-medium mb-1">About These Dates</p>
              <p className="text-amber-600">
                Most dates are <strong>quality estimates</strong> (peak freshness) from USDA FoodKeeper.
                Items showing &ldquo;left&rdquo; instead of &ldquo;fresh&rdquo; are <strong>food safety dates</strong> (raw meat, poultry, fish, leftovers) from FDA guidelines.
                Always trust your senses — if food looks, smells, or feels off, discard it.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Clear All Confirmation Modal */}
      {clearConfirm.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-scale-in">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Clear {clearConfirm.shelfName}?
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                This will delete {clearConfirm.items.reduce((sum, item) => sum + (item.quantity || 1), 0)} item{clearConfirm.items.reduce((sum, item) => sum + (item.quantity || 1), 0) !== 1 ? 's' : ''} from your fridge. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelClearAll}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmClearAll}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
