'use client';

import { useState, useEffect } from 'react';
import { formatGroceryName, formatCategoryName } from '../../../lib/utils';
import { StorageLocation } from '../../../lib/types';
import {
  LIMITS,
  validateItemName,
  validatePurchaseDate,
  validateExpiryDate
} from '../../../lib/validation';

export default function EditGroceryModal({ grocery, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'other',
    purchaseDate: '',
    expiryDate: '',
    quantity: 1,
    storageLocation: StorageLocation.FRIDGE
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (grocery) {
      setFormData({
        name: grocery.name || '',
        category: grocery.category || 'other',
        purchaseDate: grocery.purchaseDate || '',
        expiryDate: grocery.expiryDate || '',
        quantity: grocery.quantity || 1,
        storageLocation: grocery.storageLocation || StorageLocation.FRIDGE
      });
      setErrors({});
    }
  }, [grocery]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});

    // Validate item name
    const nameValidation = validateItemName(formData.name);
    if (!nameValidation.valid) {
      setErrors(prev => ({ ...prev, name: nameValidation.error }));
      return;
    }

    // Validate purchase date
    const purchaseDateToValidate = formData.purchaseDate || new Date().toISOString().split('T')[0];
    const purchaseValidation = validatePurchaseDate(purchaseDateToValidate);
    if (!purchaseValidation.valid) {
      setErrors(prev => ({ ...prev, purchaseDate: purchaseValidation.error }));
      return;
    }

    // Validate expiry date
    if (!formData.expiryDate) {
      setErrors(prev => ({ ...prev, expiryDate: 'Expiry date is required' }));
      return;
    }
    const expiryValidation = validateExpiryDate(formData.expiryDate, purchaseDateToValidate);
    if (!expiryValidation.valid) {
      setErrors(prev => ({ ...prev, expiryDate: expiryValidation.error }));
      return;
    }

    const updatedGrocery = {
      ...formData,
      name: nameValidation.sanitized,
      purchaseDate: purchaseDateToValidate,
      quantity: formData.quantity,
      storageLocation: formData.storageLocation
    };

    onSave(updatedGrocery);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleQuantityChange = (delta) => {
    setFormData(prev => ({
      ...prev,
      quantity: Math.max(1, Math.min(99, prev.quantity + delta))
    }));
  };

  const categories = [
    'vegetables',
    'fruits', 
    'meat',
    'dairy',
    'pantry',
    'beverages',
    'leftovers',
    'bakery',
    'frozen',
    'other'
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Edit Grocery Item</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name & Quantity Row */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Item Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                maxLength={LIMITS.MAX_ITEM_NAME_LENGTH}
                className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter item name"
                required
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>
              <div className="flex items-center gap-2 h-[50px]">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(-1)}
                  className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-700 font-bold transition-colors"
                >−</button>
                <span className="font-bold text-gray-700 min-w-[28px] text-center text-lg">
                  {formData.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => handleQuantityChange(1)}
                  className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-700 font-bold transition-colors"
                >+</button>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {formatCategoryName(category)}
                </option>
              ))}
            </select>
          </div>

          {/* Storage Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Storage Location
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, storageLocation: StorageLocation.FREEZER }))}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  formData.storageLocation === StorageLocation.FREEZER
                    ? 'bg-cyan-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-cyan-50'
                }`}
              >
                <span>❄️</span>
                <span>Freezer</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, storageLocation: StorageLocation.FRIDGE }))}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  formData.storageLocation === StorageLocation.FRIDGE
                    ? 'bg-slate-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>🧊</span>
                <span>Fridge</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, storageLocation: StorageLocation.PANTRY }))}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  formData.storageLocation === StorageLocation.PANTRY
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-amber-50'
                }`}
              >
                <span>🏠</span>
                <span>Pantry</span>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700 mb-2">
              Purchase Date
            </label>
            <input
              type="date"
              id="purchaseDate"
              name="purchaseDate"
              value={formData.purchaseDate}
              onChange={handleChange}
              max={(() => {
                const d = new Date();
                d.setDate(d.getDate() + LIMITS.MAX_PURCHASE_DATE_FUTURE_DAYS);
                return d.toISOString().split('T')[0];
              })()}
              className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.purchaseDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.purchaseDate && (
              <p className="mt-1 text-sm text-red-600">{errors.purchaseDate}</p>
            )}
          </div>

          <div>
            <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-2">
              Expiry Date
            </label>
            <input
              type="date"
              id="expiryDate"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleChange}
              min={formData.purchaseDate || new Date().toISOString().split('T')[0]}
              max={(() => {
                const d = new Date();
                d.setFullYear(d.getFullYear() + LIMITS.MAX_EXPIRY_YEARS_AHEAD);
                return d.toISOString().split('T')[0];
              })()}
              className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.expiryDate ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.expiryDate && (
              <p className="mt-1 text-sm text-red-600">{errors.expiryDate}</p>
            )}
          </div>

          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}