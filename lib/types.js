export const GroceryItem = {
  id: 'string',
  name: 'string',
  category: 'string',
  purchaseDate: 'Date',
  expiryDate: 'Date',
  daysUntilExpiry: 'number',
  imageUrl: 'string',
  addedManually: 'boolean',
  status: 'fresh' | 'expiring_soon' | 'expired',
  createdAt: 'Date',
  updatedAt: 'Date'
};

export const ExpiryStatus = {
  FRESH: 'fresh',
  EXPIRING_SOON: 'expiring_soon', 
  EXPIRED: 'expired'
};

export const Category = {
  DAIRY: 'Dairy',
  MEAT: 'Meat',
  VEGETABLES: 'Vegetables',
  FRUITS: 'Fruits',
  BAKERY: 'Bakery',
  FROZEN: 'Frozen',
  PANTRY: 'Pantry',
  BEVERAGES: 'Beverages',
  OTHER: 'Other'
};

export const StorageLocation = {
  FRIDGE: 'fridge',
  FREEZER: 'freezer',
  PANTRY: 'pantry'
};