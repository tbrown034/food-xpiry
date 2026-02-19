'use client';

import { useMemo, useState } from 'react';
import { getFoodEmoji } from '../../../lib/foodEmojis';
import { StorageLocation } from '../../../lib/types';

// Tab configuration with styling
const TABS = [
  {
    id: StorageLocation.FREEZER,
    label: 'Freezer',
    icon: '❄️',
    activeStyle: 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30',
    inactiveStyle: 'bg-slate-100 text-slate-600 hover:bg-cyan-50',
    interiorBg: 'from-cyan-50 via-blue-50/50 to-cyan-100/80',
    frostOpacity: 'opacity-40',
    accentColor: 'bg-cyan-500',
  },
  {
    id: StorageLocation.FRIDGE,
    label: 'Fridge',
    icon: '🧊',
    activeStyle: 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-lg shadow-slate-500/30 ring-2 ring-white/20',
    inactiveStyle: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
    interiorBg: 'from-slate-50 via-white to-slate-100/80',
    frostOpacity: 'opacity-20',
    accentColor: 'bg-slate-500',
  },
  {
    id: StorageLocation.PANTRY,
    label: 'Pantry',
    icon: '🏠',
    activeStyle: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30',
    inactiveStyle: 'bg-slate-100 text-slate-600 hover:bg-amber-50',
    interiorBg: 'from-amber-50/50 via-orange-50/30 to-amber-100/40',
    frostOpacity: 'opacity-0', // No frost in pantry
    accentColor: 'bg-amber-500',
  },
];

export default function KitchenContents({
  groceries,
  onItemClick,
  onMarkAsEaten,
  onDeleteItem,
  onChangeLocation,
}) {
  // Active tab state - default to fridge
  const [activeTab, setActiveTab] = useState(StorageLocation.FRIDGE);
  // State for clear all confirmation
  const [clearConfirm, setClearConfirm] = useState({ show: false, shelfName: '', items: [] });

  // Get current tab config
  const currentTab = TABS.find(t => t.id === activeTab) || TABS[1];

  // Group identical items (same name + expiry date) and sum their quantities
  const groupItems = (items) => {
    const grouped = new Map();
    items.forEach(item => {
      const key = `${item.name.toLowerCase()}-${item.expiryDate}`;
      const itemQty = item.quantity || 1;
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

  // Count items per location for tab badges
  const locationCounts = useMemo(() => {
    const activeItems = groceries.filter(i => !i.eaten);
    const counts = {
      [StorageLocation.FREEZER]: 0,
      [StorageLocation.FRIDGE]: 0,
      [StorageLocation.PANTRY]: 0,
    };
    const urgent = {
      [StorageLocation.FREEZER]: 0,
      [StorageLocation.FRIDGE]: 0,
      [StorageLocation.PANTRY]: 0,
    };

    activeItems.forEach(item => {
      const loc = item.storageLocation || StorageLocation.FRIDGE;
      counts[loc]++;
      if (item.daysUntilExpiry <= 3) urgent[loc]++;
    });

    return { counts, urgent };
  }, [groceries]);

  // Filter and group items by urgency for current tab
  const { expired, useSoon, thisWeek, crisper } = useMemo(() => {
    const activeItems = groceries.filter(i => !i.eaten);
    // Filter by storage location
    const locationItems = activeItems.filter(
      i => (i.storageLocation || StorageLocation.FRIDGE) === activeTab
    );
    const sorted = [...locationItems].sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    return {
      expired: groupItems(sorted.filter(i => i.daysUntilExpiry < 0)),
      useSoon: groupItems(sorted.filter(i => i.daysUntilExpiry >= 0 && i.daysUntilExpiry <= 3)),
      thisWeek: groupItems(sorted.filter(i => i.daysUntilExpiry > 3 && i.daysUntilExpiry <= 7)),
      crisper: groupItems(sorted.filter(i => i.daysUntilExpiry > 7)),
    };
  }, [groceries, activeTab]);

  const expiredCount = expired.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const handleClearAllExpired = () => {
    setClearConfirm({ show: true, shelfName: 'All Expired Items', items: expired });
  };

  // Get display text for expiry
  const getDaysText = (item) => {
    if (item.eaten) return 'Eaten';
    const days = item.daysUntilExpiry;
    const isSafety = item.dateType === 'safety';

    if (days < 0) {
      const daysAgo = Math.abs(days);
      return isSafety
        ? `⚠️ ${daysAgo}d over`
        : (daysAgo === 1 ? 'Expired 1d' : `Expired ${daysAgo}d`);
    }
    if (days === 0) return isSafety ? 'Use today!' : 'Use today';
    if (days === 1) return isSafety ? '1d left' : '1d fresh';
    return isSafety ? `${days}d left` : `${days}d fresh`;
  };

  // Get urgency styles
  const getUrgencyStyle = (item) => {
    if (item.eaten) return { badge: 'text-emerald-700 bg-emerald-100/90', glow: '' };
    if (item.daysUntilExpiry < 0) return { badge: 'text-orange-700 bg-orange-100/90', glow: '' };
    if (item.daysUntilExpiry <= 3) return { badge: 'text-amber-700 bg-amber-100/90', glow: '' };
    if (item.daysUntilExpiry <= 7) return { badge: 'text-sky-700 bg-sky-100/90', glow: '' };
    return { badge: 'text-emerald-600 bg-emerald-50/90', glow: '' };
  };

  // Food item component with location switch option
  const FoodItem = ({ item }) => {
    const [showActions, setShowActions] = useState(false);
    const emoji = getFoodEmoji(item);
    const urgencyStyle = getUrgencyStyle(item);
    const quantity = item.quantity || 1;

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

    const handleMove = (e, targetLocation) => {
      e.stopPropagation();
      const id = item.ids ? item.ids[0] : item.id;
      onChangeLocation?.(id, targetLocation);
      setShowActions(false);
    };

    const handleItemClick = (e) => {
      if (!item.eaten) {
        if (showActions) {
          onItemClick(item);
        } else {
          setShowActions(true);
        }
      } else {
        onItemClick(item);
      }
    };

    const handleBlur = () => {
      setTimeout(() => setShowActions(false), 200);
    };

    // Get other locations for move buttons
    const otherLocations = TABS.filter(t => t.id !== activeTab);

    return (
      <div
        onClick={handleItemClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleItemClick(e);
          }
        }}
        onMouseEnter={() => !item.eaten && setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onBlur={handleBlur}
        className="relative flex flex-col items-center cursor-pointer group"
        tabIndex={0}
        role="button"
        aria-label={`${item.name}, ${getDaysText(item)}. Click for details.`}
      >
        {/* Action buttons */}
        {!item.eaten && (
          <div
            className={`
              absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-30
              transition-all duration-300 ease-in-out
              ${showActions ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}
            `}
          >
            {/* Move to other locations */}
            {otherLocations.map(loc => (
              <button
                key={loc.id}
                onClick={(e) => handleMove(e, loc.id)}
                className="w-7 h-7 rounded-full bg-slate-500/90 hover:bg-slate-600 text-white flex items-center justify-center shadow-md transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 cursor-pointer text-xs"
                title={`Move to ${loc.label}`}
                aria-label={`Move ${item.name} to ${loc.label}`}
              >
                {loc.icon}
              </button>
            ))}
            <button
              onClick={handleEat}
              className="w-8 h-8 rounded-full bg-emerald-500/90 hover:bg-emerald-600 text-white flex items-center justify-center shadow-md transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 cursor-pointer"
              title="Mark as eaten"
              aria-label={`Mark ${item.name} as eaten`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="w-8 h-8 rounded-full bg-slate-400/90 hover:bg-rose-500 text-white flex items-center justify-center shadow-md transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 cursor-pointer"
              title="Delete"
              aria-label={`Delete ${item.name}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* The food emoji */}
        <div className={`
          relative transition-all duration-300 ease-in-out
          ${showActions && !item.eaten ? '-translate-y-1' : ''}
          ${item.eaten ? 'opacity-40 grayscale' : ''}
        `}>
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

          {/* Reflection on shelf */}
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
            text-[10px] sm:text-[11px] font-bold mt-0.5 px-1.5 py-0.5 rounded-full inline-block
            ${urgencyStyle.badge}
          `}>
            {getDaysText(item)}
          </span>
          {item.source && !item.eaten && (
            <span className={`
              block text-[10px] mt-0.5 font-medium
              ${item.source === 'AI' ? 'text-purple-700' :
                item.source === 'default' || item.source === 'USDA Food Safety Guidelines' ? 'text-orange-600' :
                'text-slate-500'}
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

  const handleClearAllClick = (shelfName, items) => {
    setClearConfirm({ show: true, shelfName, items });
  };

  const handleConfirmClearAll = () => {
    clearConfirm.items.forEach(item => {
      const ids = item.ids || [item.id];
      ids.forEach(id => onDeleteItem?.(id));
    });
    setClearConfirm({ show: false, shelfName: '', items: [] });
  };

  const handleCancelClearAll = () => {
    setClearConfirm({ show: false, shelfName: '', items: [] });
  };

  // Glass shelf component
  const GlassShelf = ({ title, subtitle, items, accentColor = 'bg-slate-400' }) => {
    const totalCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const isEmpty = items.length === 0;

    return (
      <div className="relative mb-1">
        <div className="flex items-center justify-between px-4 pt-2 pb-1">
          <div className="flex items-center gap-2.5">
            <div className={`w-1 h-8 rounded-full ${accentColor}`} />
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

          {!isEmpty && (
            <button
              onClick={() => handleClearAllClick(title, items)}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

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

        {/* Glass shelf surface */}
        <div className="relative mx-2">
          <div className="h-3 relative">
            <div className={`absolute inset-0 rounded-t-sm ${
              activeTab === StorageLocation.FREEZER
                ? 'bg-gradient-to-b from-cyan-200/60 via-white/60 to-cyan-100/40'
                : activeTab === StorageLocation.PANTRY
                ? 'bg-gradient-to-b from-amber-100/40 via-orange-50/60 to-amber-50/30'
                : 'bg-gradient-to-b from-cyan-100/40 via-white/60 to-cyan-50/30'
            }`} />
            <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-slate-300/50 via-slate-200/70 to-slate-300/50" />
          </div>
          <div className="h-2 bg-gradient-to-b from-slate-300/80 via-slate-200/60 to-slate-100/40 rounded-b-sm shadow-sm" />
          <div className="absolute -left-1 top-0 w-2 h-full bg-gradient-to-r from-slate-400/60 to-transparent rounded-l" />
          <div className="absolute -right-1 top-0 w-2 h-full bg-gradient-to-l from-slate-400/60 to-transparent rounded-r" />
        </div>
      </div>
    );
  };

  // Crisper drawer - styled per location
  const CrisperDrawer = ({ items }) => {
    const totalCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const isEmpty = items.length === 0;

    const drawerStyle = activeTab === StorageLocation.FREEZER
      ? 'from-cyan-100/60 via-blue-50/40 to-cyan-100/50'
      : activeTab === StorageLocation.PANTRY
      ? 'from-amber-100/50 via-orange-50/40 to-amber-100/30'
      : 'from-emerald-50/50 via-white/40 to-emerald-50/30';

    const drawerTitle = activeTab === StorageLocation.PANTRY
      ? 'Long-lasting'
      : 'Fresh & Long-lasting';

    return (
      <div className="relative mx-2 mt-2">
        <div className="flex items-center justify-between px-2 mb-2">
          <div className="flex items-center gap-2.5">
            <div className={`w-1 h-8 rounded-full ${currentTab.accentColor}`} />
            <div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-base font-semibold text-slate-700 tracking-tight">{drawerTitle}</h3>
                <span className="text-sm font-medium text-slate-400">{totalCount}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">More than a week</p>
            </div>
          </div>

          {!isEmpty && (
            <button
              onClick={() => handleClearAllClick(drawerTitle, items)}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <div className="relative">
          <div className={`pt-4 pb-3 px-4 bg-gradient-to-b ${drawerStyle} rounded-xl border border-slate-200/50 shadow-inner backdrop-blur-sm`}>
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
          <div className="h-2 bg-gradient-to-b from-slate-200/60 to-slate-300/40 rounded-b-xl shadow-sm" />
        </div>
      </div>
    );
  };

  // Empty state for a location
  const EmptyState = () => {
    const messages = {
      [StorageLocation.FREEZER]: {
        title: 'Freezer is empty',
        subtitle: 'Frozen items like ice cream, frozen pizza, and frozen veggies will appear here',
      },
      [StorageLocation.FRIDGE]: {
        title: 'Fridge is empty',
        subtitle: 'Fresh items like dairy, meat, and produce will appear here',
      },
      [StorageLocation.PANTRY]: {
        title: 'Pantry is empty',
        subtitle: 'Shelf-stable items like cereal, pasta, and canned goods will appear here',
      },
    };

    const { title, subtitle } = messages[activeTab];

    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <span className="text-6xl mb-4">{currentTab.icon}</span>
        <h3 className="text-lg font-semibold text-slate-600 mb-2">{title}</h3>
        <p className="text-sm text-slate-400 max-w-xs">{subtitle}</p>
      </div>
    );
  };

  const totalItems = expired.length + useSoon.length + thisWeek.length + crisper.length;
  const hasNoItems = totalItems === 0;

  return (
    <div className="min-h-full pb-4 relative">
      {/* Interior background - changes per tab */}
      <div className={`absolute inset-0 bg-gradient-to-b ${currentTab.interiorBg} pointer-events-none transition-colors duration-300`} />

      {/* Light effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(ellipse 100% 40% at 50% 0%, rgba(255,255,255,0.9) 0%, transparent 70%)'
        }}
      />

      {/* Frost texture - varies by location */}
      <div
        className={`absolute inset-0 pointer-events-none ${currentTab.frostOpacity} transition-opacity duration-300`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L30 60M0 30L60 30M10 10L50 50M50 10L10 50' stroke='%23e2e8f0' stroke-width='0.5' fill='none'/%3E%3C/svg%3E")`,
          backgroundSize: '30px 30px'
        }}
      />

      {/* Tab Navigation */}
      <div className="relative sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-3 py-2">
        <div className="flex gap-2 justify-center">
          {TABS.map(tab => {
            const count = locationCounts.counts[tab.id];
            const urgentCount = locationCounts.urgent[tab.id];
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative flex items-center gap-1.5 px-4 py-2 rounded-full font-medium text-sm
                  transition-all duration-200 ease-in-out cursor-pointer
                  ${isActive ? tab.activeStyle : tab.inactiveStyle}
                `}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={`
                    ml-1 min-w-[20px] h-5 rounded-full text-xs font-bold flex items-center justify-center px-1.5
                    ${isActive ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-600'}
                  `}>
                    {count}
                  </span>
                )}
                {/* Urgent indicator */}
                {urgentCount > 0 && !isActive && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 border-2 border-white" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Clear All Expired Banner */}
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

      {/* Content */}
      <div className="relative pt-2">
        {hasNoItems ? (
          <EmptyState />
        ) : (
          <>
            {/* Expired shelf - only if items */}
            {expired.length > 0 && (
              <GlassShelf
                title="Expired"
                subtitle="Past due"
                items={expired}
                accentColor="bg-red-500"
              />
            )}

            {/* Use Soon */}
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

            {/* Crisper/Long-lasting */}
            <CrisperDrawer items={crisper} />
          </>
        )}

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
                This will delete {clearConfirm.items.reduce((sum, item) => sum + (item.quantity || 1), 0)} item{clearConfirm.items.reduce((sum, item) => sum + (item.quantity || 1), 0) !== 1 ? 's' : ''} from your kitchen. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelClearAll}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmClearAll}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors cursor-pointer"
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
