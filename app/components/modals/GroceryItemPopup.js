'use client';

import { useState, useEffect } from 'react';
import { Category } from '../../../lib/types';
import { formatExpiryDate } from '../../../lib/utils';
import {
  LIMITS,
  validateItemName,
  validatePurchaseDate,
  validateExpiryDate,
  clampShelfLifeDays
} from '../../../lib/validation';
import { useDialogA11y } from '../../../lib/useDialogA11y';

export default function GroceryItemPopup({ item, onConfirm, onCancel }) {
  const dialogRef = useDialogA11y(true, onCancel);
  const [formData, setFormData] = useState({
    name: item?.name || '',
    category: item?.estimatedCategory || Category.OTHER,
    purchaseDate: new Date().toISOString().split('T')[0],
    shelfLifeDays: clampShelfLifeDays(item?.shelfLifeDays || 7),
    expiryDate: '',
    quantity: item?.quantity || 1
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const calculateExpiryDate = () => {
      const purchaseDate = new Date(formData.purchaseDate);
      const expiryDate = new Date(purchaseDate);
      expiryDate.setDate(expiryDate.getDate() + formData.shelfLifeDays);
      return expiryDate.toISOString().split('T')[0];
    };

    setFormData(prev => ({
      ...prev,
      expiryDate: calculateExpiryDate()
    }));
  }, [formData.purchaseDate, formData.shelfLifeDays]);

  const handleShelfLifeChange = (delta) => {
    setFormData(prev => ({
      ...prev,
      shelfLifeDays: clampShelfLifeDays(prev.shelfLifeDays + delta)
    }));
  };

  const handleQuantityChange = (delta) => {
    setFormData(prev => ({
      ...prev,
      quantity: Math.max(LIMITS.MIN_QUANTITY, Math.min(LIMITS.MAX_QUANTITY, prev.quantity + delta))
    }));
  };

  const handleConfirm = () => {
    setErrors({});

    // Validate item name
    const nameValidation = validateItemName(formData.name);
    if (!nameValidation.valid) {
      setErrors(prev => ({ ...prev, name: nameValidation.error }));
      return;
    }

    // Validate purchase date
    const purchaseValidation = validatePurchaseDate(formData.purchaseDate);
    if (!purchaseValidation.valid) {
      setErrors(prev => ({ ...prev, purchaseDate: purchaseValidation.error }));
      return;
    }

    // Validate expiry date
    const expiryValidation = validateExpiryDate(formData.expiryDate, formData.purchaseDate);
    if (!expiryValidation.valid) {
      setErrors(prev => ({ ...prev, expiryDate: expiryValidation.error }));
      return;
    }

    onConfirm({
      name: nameValidation.sanitized,
      category: formData.category,
      purchaseDate: formData.purchaseDate,
      expiryDate: formData.expiryDate,
      quantity: formData.quantity,
      addedManually: false
    });
  };

  const expiryInfo = formData.expiryDate ? formatExpiryDate(formData.expiryDate) : null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="grocery-item-title">
      <div className="w-full max-w-md" ref={dialogRef} tabIndex={-1}>
        <div className="relative" style={{ transform: 'rotate(-1deg)' }}>
          {/* Shadow */}
          <div className="absolute inset-0 bg-black/20 rounded-sm translate-y-2 translate-x-1" />

          {/* Magnet */}
          <div
            className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full z-10"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #60a5fa 0%, #2563eb 50%, #1e40af 100%)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3), inset 0 2px 3px rgba(255,255,255,0.4)',
            }}
          />

          {/* Close button */}
          <button
            onClick={onCancel}
            className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center shadow-lg z-20 transition-all hover:scale-110"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Sticky Note */}
          <div className="relative bg-gradient-to-br from-yellow-100 via-yellow-50 to-amber-50 rounded-sm shadow-2xl p-6">
            {/* Header */}
            <div className="mb-4 pb-3 border-b-2 border-slate-300">
              <h2 id="grocery-item-title" className="text-xl font-bold text-slate-800" style={{ fontFamily: "'Patrick Hand', cursive, sans-serif" }}>
                Confirm Item
              </h2>
            </div>

            <div className="space-y-4">
              {/* Item Name & Quantity Row */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-600 mb-1">Item Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    maxLength={LIMITS.MAX_ITEM_NAME_LENGTH}
                    className={`w-full bg-transparent border-b-2 focus:border-slate-600 px-1 py-2 text-lg text-slate-800 focus:outline-none transition-colors ${
                      errors.name ? 'border-red-500' : 'border-slate-300'
                    }`}
                    style={{ fontFamily: "'Patrick Hand', cursive, sans-serif" }}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-600">{errors.name}</p>
                  )}
                </div>
                <div className="w-28">
                  <label className="block text-sm font-medium text-slate-600 mb-1">Qty</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(-1)}
                      className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700 font-bold transition-colors"
                    >−</button>
                    <span className="font-bold text-slate-700 min-w-[28px] text-center text-lg">
                      {formData.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(1)}
                      className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700 font-bold transition-colors"
                    >+</button>
                  </div>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-white/50 border border-slate-300 rounded px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value={Category.DAIRY}>Dairy</option>
                  <option value={Category.MEAT}>Meat</option>
                  <option value={Category.VEGETABLES}>Vegetables</option>
                  <option value={Category.FRUITS}>Fruits</option>
                  <option value={Category.BAKERY}>Bakery</option>
                  <option value={Category.FROZEN}>Frozen</option>
                  <option value={Category.PANTRY}>Pantry</option>
                  <option value={Category.BEVERAGES}>Beverages</option>
                  <option value={Category.OTHER}>Other</option>
                </select>
              </div>

              {/* Purchase Date */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Bought On</label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                  max={(() => {
                    const d = new Date();
                    d.setDate(d.getDate() + LIMITS.MAX_PURCHASE_DATE_FUTURE_DAYS);
                    return d.toISOString().split('T')[0];
                  })()}
                  className={`w-full bg-white/50 border rounded px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                    errors.purchaseDate ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
                {errors.purchaseDate && (
                  <p className="mt-1 text-xs text-red-600">{errors.purchaseDate}</p>
                )}
              </div>

              {/* Shelf Life & Expiry Display */}
              <div className={`rounded-lg p-3 ${errors.expiryDate ? 'bg-red-50/80' : expiryInfo?.urgent ? 'bg-red-50/80' : 'bg-white/50'}`}>
                {expiryInfo && !errors.expiryDate && (
                  <div className={`text-center text-lg font-bold mb-2 ${expiryInfo.color}`}>
                    {expiryInfo.text}
                  </div>
                )}
                {errors.expiryDate && (
                  <p className="text-center text-sm text-red-600 mb-2">{errors.expiryDate}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleShelfLifeChange(-1)}
                      className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700 font-bold transition-colors"
                    >−</button>
                    <span className="font-bold text-slate-700 min-w-[60px] text-center">
                      {formData.shelfLifeDays} days
                    </span>
                    <button
                      type="button"
                      onClick={() => handleShelfLifeChange(1)}
                      className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700 font-bold transition-colors"
                    >+</button>
                  </div>
                  <span className="text-xs text-slate-500">{formData.expiryDate}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleConfirm}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white py-3 px-4 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
              >
                Add to Fridge
              </button>
              <button
                onClick={onCancel}
                className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}