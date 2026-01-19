'use client';

import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { storage } from '../../lib/storage';
import { calculateDaysUntilExpiry, getExpiryStatus } from '../../lib/utils';
import { assignStorageLocation, calculateExpiryDate } from '../../lib/storageLocationAssigner';
import { StorageLocation } from '../../lib/types';

const GroceryContext = createContext(null);

// Action types
const ACTIONS = {
  SET: 'SET',
  ADD: 'ADD',
  ADD_BATCH: 'ADD_BATCH',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  DELETE_BY_PURCHASE_DATE: 'DELETE_BY_PURCHASE_DATE',
  CLEAR: 'CLEAR',
  MARK_EATEN: 'MARK_EATEN',
  MARK_EXPIRED: 'MARK_EXPIRED',
};

function groceryReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET:
      return action.groceries;
    case ACTIONS.ADD:
      return [...state, action.grocery];
    case ACTIONS.ADD_BATCH:
      return [...state, ...action.groceries];
    case ACTIONS.UPDATE:
      return state.map(g => g.id === action.id ? { ...g, ...action.updates } : g);
    case ACTIONS.DELETE:
      return state.filter(g => g.id !== action.id);
    case ACTIONS.DELETE_BY_PURCHASE_DATE:
      return state.filter(g => g.purchaseDate !== action.purchaseDate);
    case ACTIONS.CLEAR:
      return [];
    case ACTIONS.MARK_EATEN:
      return state.map(g => g.id === action.id ? { ...g, eaten: true, eatenAt: action.eatenAt } : g);
    case ACTIONS.MARK_EXPIRED:
      return state.map(g => g.id === action.id ? { ...g, markedExpired: true } : g);
    default:
      return state;
  }
}

// Helper to enrich grocery with computed fields
function enrichGrocery(grocery) {
  const daysUntilExpiry = calculateDaysUntilExpiry(grocery.expiryDate);
  return {
    ...grocery,
    daysUntilExpiry,
    status: getExpiryStatus(daysUntilExpiry),
  };
}

export function GroceryProvider({ children }) {
  const [groceries, dispatch] = useReducer(groceryReducer, []);

  // Load groceries on mount and refresh every 60 seconds
  useEffect(() => {
    const loadGroceries = () => {
      try {
        let stored = storage.getGroceries();

        // Migration: Add storageLocation to items that don't have it
        const needsMigration = stored.some(item => !item.storageLocation);
        if (needsMigration) {
          stored = stored.map(item => {
            if (item.storageLocation) return item;
            // Assign storage location based on item properties
            return {
              ...item,
              storageLocation: assignStorageLocation({
                name: item.name,
                category: item.category,
                modifier: item.modifier || ''
              }),
              updatedAt: new Date().toISOString()
            };
          });
          // Persist migrated items
          storage.saveGroceries(stored);
          console.log('Migrated storage locations for existing items');
        }

        const enriched = stored.map(enrichGrocery);
        dispatch({ type: ACTIONS.SET, groceries: enriched });
      } catch {
        // Silent fail - toast will be shown by consuming component if needed
      }
    };

    loadGroceries();
    const interval = setInterval(loadGroceries, 60000);
    return () => clearInterval(interval);
  }, []);

  // Check storage status
  const checkStorage = useCallback(() => {
    return storage.checkStatus();
  }, []);

  // Find duplicates for a potential new item
  const findDuplicates = useCallback((item) => {
    return storage.findDuplicates(item);
  }, []);

  // Check if we can add items
  const canAdd = useCallback((count = 1) => {
    return storage.canAdd(count);
  }, []);

  // Add single grocery
  const addGrocery = useCallback((groceryData, batchMetadata = null) => {
    try {
      const metadata = batchMetadata || {
        source: 'manual',
        batchId: Date.now().toString(),
        addedAt: new Date().toISOString(),
      };

      const result = storage.addGrocery({
        ...groceryData,
        batchMetadata: metadata,
      });

      // Handle new return format from storage
      if (!result.success) {
        return { success: false, error: result.error };
      }

      const enriched = enrichGrocery(result.grocery);
      dispatch({ type: ACTIONS.ADD, grocery: enriched });
      return {
        success: true,
        grocery: enriched,
        warning: result.warning  // Pass through any warnings
      };
    } catch {
      return { success: false, error: 'Failed to add grocery item' };
    }
  }, []);

  // Add batch of groceries
  const addBatch = useCallback((items, source = 'manual', storeName = null) => {
    try {
      const batchId = Date.now().toString();
      const batchMetadata = {
        source,
        storeName,
        batchId,
        addedAt: new Date().toISOString(),
      };

      // Use new batch add method
      const itemsWithMetadata = items.map(item => ({
        ...item,
        batchMetadata,
      }));

      const result = storage.addGroceries(itemsWithMetadata);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      const enrichedItems = result.added.map(enrichGrocery);
      dispatch({ type: ACTIONS.ADD_BATCH, groceries: enrichedItems });

      return {
        success: true,
        count: enrichedItems.length,
        warning: result.warning  // Pass through any warnings
      };
    } catch {
      return { success: false, error: 'Failed to add items' };
    }
  }, []);

  // Update grocery
  const updateGrocery = useCallback((id, updates) => {
    try {
      const saved = storage.updateGrocery(id, updates);
      if (saved) {
        const enriched = enrichGrocery(saved);
        dispatch({ type: ACTIONS.UPDATE, id, updates: enriched });
        return { success: true, grocery: enriched };
      }
      return { success: false, error: 'Item not found' };
    } catch {
      return { success: false, error: 'Failed to update item' };
    }
  }, []);

  // Delete grocery
  const deleteGrocery = useCallback((id) => {
    try {
      storage.deleteGrocery(id);
      dispatch({ type: ACTIONS.DELETE, id });
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to delete item' };
    }
  }, []);

  // Delete by purchase date (shopping trip)
  const deleteByPurchaseDate = useCallback((purchaseDate) => {
    try {
      storage.deleteByPurchaseDate(purchaseDate);
      dispatch({ type: ACTIONS.DELETE_BY_PURCHASE_DATE, purchaseDate });
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to delete shopping trip' };
    }
  }, []);

  // Clear all
  const clearAll = useCallback(() => {
    try {
      storage.clearAllGroceries();
      dispatch({ type: ACTIONS.CLEAR });
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to clear groceries' };
    }
  }, []);

  // Mark as eaten
  const markAsEaten = useCallback((id) => {
    try {
      const updated = storage.markAsEaten(id);
      if (updated) {
        dispatch({ type: ACTIONS.MARK_EATEN, id, eatenAt: updated.eatenAt });
        return { success: true };
      }
      return { success: false, error: 'Item not found' };
    } catch {
      return { success: false, error: 'Failed to mark as eaten' };
    }
  }, []);

  // Mark as expired
  const markAsExpired = useCallback((id) => {
    try {
      const updated = storage.markAsExpired(id);
      if (updated) {
        dispatch({ type: ACTIONS.MARK_EXPIRED, id });
        return { success: true };
      }
      return { success: false, error: 'Item not found' };
    } catch {
      return { success: false, error: 'Failed to mark as expired' };
    }
  }, []);

  // Change storage location (fridge/freezer/pantry)
  // Auto-updates shelf life based on new location
  const changeStorageLocation = useCallback((id, newLocation) => {
    try {
      const item = groceries.find(g => g.id === id);
      if (!item) {
        return { success: false, error: 'Item not found' };
      }

      const updates = { storageLocation: newLocation };

      // Update shelf life based on new location
      // Freezer items last much longer, pantry items have different timelines
      if (newLocation === StorageLocation.FREEZER && item.shelfLifeDays < 180) {
        // Moving to freezer - extend shelf life significantly
        updates.shelfLifeDays = 365; // 1 year default for frozen
        updates.expiryDate = calculateExpiryDate(365, new Date(item.purchaseDate));
        updates.source = 'USDA (frozen)';
      } else if (newLocation === StorageLocation.FRIDGE && item.storageLocation === StorageLocation.FREEZER) {
        // Moving from freezer to fridge - thawed items have shorter life
        // Use 3-5 days for thawed items per USDA guidelines
        updates.shelfLifeDays = 4;
        updates.expiryDate = calculateExpiryDate(4, new Date());
        updates.source = 'USDA (thawed)';
      }

      const result = updateGrocery(id, updates);

      if (result.success) {
        return {
          success: true,
          grocery: result.grocery,
          shelfLifeChanged: !!updates.shelfLifeDays,
          newShelfLife: updates.shelfLifeDays || item.shelfLifeDays
        };
      }
      return result;
    } catch {
      return { success: false, error: 'Failed to change storage location' };
    }
  }, [groceries, updateGrocery]);

  // Get grocery by ID
  const getGroceryById = useCallback((id) => {
    return groceries.find(g => g.id === id) || null;
  }, [groceries]);

  const value = {
    groceries,
    addGrocery,
    addBatch,
    updateGrocery,
    deleteGrocery,
    deleteByPurchaseDate,
    clearAll,
    markAsEaten,
    markAsExpired,
    changeStorageLocation,
    getGroceryById,
    // New validation methods
    checkStorage,
    findDuplicates,
    canAdd,
  };

  return (
    <GroceryContext.Provider value={value}>
      {children}
    </GroceryContext.Provider>
  );
}

export function useGroceries() {
  const context = useContext(GroceryContext);
  if (!context) {
    throw new Error('useGroceries must be used within a GroceryProvider');
  }
  return context;
}
