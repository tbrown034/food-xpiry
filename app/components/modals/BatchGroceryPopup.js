'use client';

import { useState, useEffect } from 'react';
import { Category, StorageLocation } from '../../../lib/types';
import { getFoodEmoji } from '../../../lib/foodEmojis';
import { Magnet } from '../svg';
import {
  LIMITS,
  validateItemName,
  validatePurchaseDate,
  validateExpiryDate,
  clampShelfLifeDays
} from '../../../lib/validation';

// Map lowercase API categories to Category enum values
function normalizeCategory(apiCategory) {
  if (!apiCategory) return Category.OTHER;

  const categoryMap = {
    'dairy': Category.DAIRY,
    'meat': Category.MEAT,
    'vegetables': Category.VEGETABLES,
    'fruits': Category.FRUITS,
    'bakery': Category.BAKERY,
    'frozen': Category.FROZEN,
    'pantry': Category.PANTRY,
    'beverages': Category.BEVERAGES,
    'other': Category.OTHER,
  };

  const normalized = categoryMap[apiCategory.toLowerCase()];
  if (normalized) return normalized;

  const validCategories = Object.values(Category);
  if (validCategories.includes(apiCategory)) return apiCategory;

  return Category.OTHER;
}

export default function BatchGroceryPopup({ batchResult, onConfirm, onCancel }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);

  // Load items and fetch shelf life
  useEffect(() => {
    if (!batchResult?.items) return;

    const today = new Date().toISOString().split('T')[0];
    const initialItems = batchResult.items.map((item, index) => ({
      id: index,
      name: item.name || '',
      modifier: item.modifier || '',
      category: normalizeCategory(item.category),
      foodType: item.foodType || 'store-bought',
      purchaseDate: item.purchaseDate || today,
      shelfLifeDays: item.shelfLifeDays,
      expiryDate: item.expiryDate,
      storageRecommendations: item.storageRecommendations,
      source: item.source,
      confidence: item.confidence,
      quantity: item.quantity || 1,
      storageLocation: item.storageLocation || StorageLocation.FRIDGE,
    }));

    // Check if we already have shelf life data
    if (initialItems[0]?.shelfLifeDays !== undefined) {
      setItems(initialItems);
      setIsLoading(false);
      return;
    }

    // Fetch shelf life data
    setItems(initialItems);
    fetchShelfLife(initialItems);
  }, [batchResult]);

  const fetchShelfLife = async (itemsToFetch) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/get-shelf-life', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsToFetch.map(item => ({
            name: item.name,
            modifier: item.modifier,
            category: item.category,
            foodType: item.foodType,
          }))
        })
      });

      if (!response.ok) throw new Error('Failed to get shelf life');

      const result = await response.json();
      setItems(prev => prev.map((item, index) => ({
        ...item,
        ...result.items[index],
        id: item.id,
        purchaseDate: item.purchaseDate,
      })));
    } catch (err) {
      setError('Failed to get shelf life. You can still add items manually.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const adjustDays = (id, delta) => {
    const item = items.find(i => i.id === id);
    if (item?.shelfLifeDays !== undefined) {
      const newDays = clampShelfLifeDays(item.shelfLifeDays + delta);
      const newExpiry = new Date(item.purchaseDate || new Date());
      newExpiry.setDate(newExpiry.getDate() + newDays);
      setItems(prev => prev.map(i =>
        i.id === id ? { ...i, shelfLifeDays: newDays, expiryDate: newExpiry.toISOString().split('T')[0] } : i
      ));
    }
  };

  const adjustQuantity = (id, delta) => {
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, quantity: Math.max(LIMITS.MIN_QUANTITY, Math.min(LIMITS.MAX_QUANTITY, (i.quantity || 1) + delta)) } : i
    ));
  };

  const handleConfirm = () => {
    // Validate all items
    const validationErrors = [];
    const validatedItems = items.map((item, index) => {
      const nameValidation = validateItemName(item.name);
      if (!nameValidation.valid) {
        validationErrors.push(`Item ${index + 1}: ${nameValidation.error}`);
        return null;
      }

      const purchaseDate = item.purchaseDate || new Date().toISOString().split('T')[0];
      const purchaseValidation = validatePurchaseDate(purchaseDate);
      if (!purchaseValidation.valid) {
        validationErrors.push(`Item ${index + 1}: ${purchaseValidation.error}`);
        return null;
      }

      const expiryValidation = validateExpiryDate(item.expiryDate, purchaseDate);
      if (!expiryValidation.valid) {
        validationErrors.push(`Item ${index + 1}: ${expiryValidation.error}`);
        return null;
      }

      return {
        name: nameValidation.sanitized,
        modifier: item.modifier,
        category: item.category,
        foodType: item.foodType,
        purchaseDate: purchaseDate,
        expiryDate: item.expiryDate,
        shelfLifeDays: clampShelfLifeDays(item.shelfLifeDays),
        storageRecommendations: item.storageRecommendations,
        source: item.source,
        confidence: item.confidence,
        quantity: item.quantity || 1,
        storageLocation: item.storageLocation || StorageLocation.FRIDGE,
        addedManually: true
      };
    });

    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      return;
    }

    onConfirm(validatedItems.filter(Boolean));
  };

  const getExpiryText = (days) => {
    if (days === undefined) return '';
    if (days < 0) return 'Expired';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days} days`;
  };

  const getExpiryColor = (days) => {
    if (days === undefined) return 'text-slate-500';
    if (days < 0) return 'text-red-600';
    if (days <= 2) return 'text-red-500';
    if (days <= 5) return 'text-amber-500';
    return 'text-emerald-600';
  };

  // Loading state - premium sticky note style
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="relative" style={{ transform: 'rotate(-1deg)' }}>
          {/* Red magnet */}
          <Magnet
            color="red"
            size={32}
            className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 drop-shadow-lg"
          />

          {/* Soft shadow with blur */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-black/30 rounded-lg translate-y-2 blur-md" />

          {/* Note with glass effect */}
          <div className="relative w-80 rounded-lg overflow-hidden">
            {/* Base gradient - yellow/amber */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-yellow-50/95 to-orange-50/90" />

            {/* Glass shine overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent" />

            {/* Inner glow */}
            <div className="absolute inset-[1px] rounded-lg bg-gradient-to-br from-white/40 via-amber-50/20 to-transparent" />

            {/* Content */}
            <div className="relative p-6 backdrop-blur-[2px]">
              {/* Top edge highlight */}
              <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-white/70 to-transparent" />

              {/* Spinner */}
              <div className="w-14 h-14 mx-auto mb-4 relative">
                <div className="absolute inset-0 border-4 border-amber-200 rounded-full" />
                <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-slate-800 text-center mb-1 tracking-tight">
                Getting Shelf Life...
              </h3>

              {/* Info */}
              <p className="text-amber-700 font-semibold text-sm text-center mb-3">
                {items.length} items to look up
              </p>

              <p className="text-slate-400 text-xs text-center">
                This usually takes a few seconds
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                Add to Kitchen?
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {items.length} items ready to add
              </p>
            </div>
            <button
              onClick={onCancel}
              className="w-10 h-10 hover:bg-slate-100 rounded-full flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Error state */}
        {error && !isLoading && (
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-200">
            <p className="text-sm text-amber-700">{error}</p>
          </div>
        )}

        {/* Items list */}
        {!isLoading && (
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-slate-100">
              {items.map(item => (
                <div key={item.id} className="px-5 py-4 hover:bg-slate-50/50 transition-colors">
                  {editingId === item.id ? (
                    // Edit mode
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">Editing</span>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-sm text-emerald-600 font-semibold"
                        >
                          Done
                        </button>
                      </div>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        maxLength={LIMITS.MAX_ITEM_NAME_LENGTH}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                        placeholder="Item name"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={item.category}
                          onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                          className="px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                        >
                          {Object.values(Category).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <select
                          value={item.foodType}
                          onChange={(e) => updateItem(item.id, 'foodType', e.target.value)}
                          className="px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                        >
                          <option value="store-bought">Store-bought</option>
                          <option value="premade">Deli/Premade</option>
                          <option value="leftover">Leftover</option>
                        </select>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-sm text-red-500 hover:text-red-600 font-medium"
                      >
                        Remove item
                      </button>
                    </div>
                  ) : (
                    // Display mode
                    <div className="flex items-center gap-3">
                      {/* Emoji with premium container */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center flex-shrink-0 shadow-sm ring-1 ring-slate-100">
                        <span className="text-2xl">{getFoodEmoji(item)}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 truncate">{item.name}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span className="font-medium">{item.category}</span>
                          {item.shelfLifeDays !== undefined && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className={`font-semibold ${getExpiryColor(item.shelfLifeDays)}`}>
                                {getExpiryText(item.shelfLifeDays)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Storage location toggle */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateItem(item.id, 'storageLocation', StorageLocation.FREEZER)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all ${
                            item.storageLocation === StorageLocation.FREEZER
                              ? 'bg-cyan-500 text-white shadow-md'
                              : 'bg-slate-100 hover:bg-cyan-100 text-slate-500'
                          }`}
                          title="Freezer"
                        >
                          ❄️
                        </button>
                        <button
                          onClick={() => updateItem(item.id, 'storageLocation', StorageLocation.FRIDGE)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all ${
                            item.storageLocation === StorageLocation.FRIDGE
                              ? 'bg-slate-600 text-white shadow-md'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                          }`}
                          title="Fridge"
                        >
                          🧊
                        </button>
                        <button
                          onClick={() => updateItem(item.id, 'storageLocation', StorageLocation.PANTRY)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all ${
                            item.storageLocation === StorageLocation.PANTRY
                              ? 'bg-amber-500 text-white shadow-md'
                              : 'bg-slate-100 hover:bg-amber-100 text-slate-500'
                          }`}
                          title="Pantry"
                        >
                          🏠
                        </button>
                      </div>

                      {/* Quantity adjuster */}
                      <div className="flex items-center gap-0.5 mr-1">
                        <button
                          onClick={() => adjustQuantity(item.id, -1)}
                          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-sm font-bold transition-colors active:scale-95"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-xs font-semibold text-slate-600">
                          {item.quantity || 1}x
                        </span>
                        <button
                          onClick={() => adjustQuantity(item.id, 1)}
                          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-sm font-bold transition-colors active:scale-95"
                        >
                          +
                        </button>
                      </div>

                      {/* Days adjuster */}
                      {item.shelfLifeDays !== undefined && (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => adjustDays(item.id, -1)}
                            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-sm font-bold transition-colors active:scale-95"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-xs font-semibold text-slate-600">
                            {item.shelfLifeDays}d
                          </span>
                          <button
                            onClick={() => adjustDays(item.id, 1)}
                            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-sm font-bold transition-colors active:scale-95"
                          >
                            +
                          </button>
                        </div>
                      )}

                      {/* Edit button - 44px touch target */}
                      <button
                        onClick={() => setEditingId(item.id)}
                        className="w-10 h-10 hover:bg-slate-100 rounded-full flex items-center justify-center transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {items.length === 0 && !isLoading && (
                <div className="py-12 text-center text-slate-400">
                  <p>No items to add</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer actions with premium buttons */}
        {!isLoading && items.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 transition-colors active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="relative flex-1 px-4 py-3 text-white rounded-xl font-semibold transition-all shadow-lg active:scale-[0.98] overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 group-hover:from-emerald-500 group-hover:to-emerald-700 transition-all" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-xl" />
              <span className="relative">Add {items.length} Items</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
