'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGroceries, useToast, useModal, MODAL_TYPES } from '../context';
import KitchenContents from '../components/ui/KitchenContents';
import Modal from '../components/modals/Modal';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import GroceryDetailModal from '../components/modals/GroceryDetailModal';
import EditGroceryModal from '../components/modals/EditGroceryModal';
import GroceryItemPopup from '../components/modals/GroceryItemPopup';
import BatchGroceryPopup from '../components/modals/BatchGroceryPopup';
import DocumentAnalysisPopup from '../components/modals/DocumentAnalysisPopup';
import AddGroceryForm from '../components/forms/AddGroceryForm';
import BatchAddGroceryForm from '../components/forms/BatchAddGroceryForm';
import ReceiptUpload from '../components/forms/ReceiptUpload';
import { getUserFriendlyMessage } from '../../lib/errorHandling';
import { calculateDaysUntilExpiry, getExpiryStatus } from '../../lib/utils';

export default function FridgePage() {
  const router = useRouter();
  const { groceries, addGrocery, addBatch, updateGrocery, deleteGrocery, clearAll, markAsEaten, markAsExpired, changeStorageLocation, getGroceryById } = useGroceries();
  const toast = useToast();
  const { modalType, modalId, openModal, closeModal, isModalOpen } = useModal();

  // Pending data for multi-step flows
  const [pendingData, setPendingData] = useState({
    groceryItem: null,
    batchResult: null,
    documentResult: null,
  });

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Get the grocery for detail/edit modals
  const selectedGrocery = modalId ? getGroceryById(modalId) : null;

  // Handlers
  const handleItemClick = (item) => {
    openModal(MODAL_TYPES.DETAIL, item.id);
  };

  const handleMarkAsEaten = (id) => {
    const result = markAsEaten(id);
    if (result.success) {
      toast.success('Marked as eaten!');
    } else {
      toast.error(result.error);
    }
  };

  const handleDeleteItem = (id) => {
    const result = deleteGrocery(id);
    if (result.success) {
      toast.success('Item deleted');
    } else {
      toast.error(result.error);
    }
  };

  const handleChangeLocation = (id, newLocation) => {
    const result = changeStorageLocation(id, newLocation);
    if (result.success) {
      const locationLabels = { fridge: 'Fridge', freezer: 'Freezer', pantry: 'Pantry' };
      const label = locationLabels[newLocation] || newLocation;
      if (result.shelfLifeChanged) {
        toast.success(`Moved to ${label} - shelf life updated`);
      } else {
        toast.success(`Moved to ${label}`);
      }
    } else {
      toast.error(result.error);
    }
  };

  const handleClearAll = () => {
    openModal(MODAL_TYPES.CLEAR_CONFIRM);
  };

  const handleConfirmClearAll = () => {
    const result = clearAll();
    if (result.success) {
      toast.success('All groceries cleared');
      closeModal();
    } else {
      toast.error(result.error);
    }
  };

  const handleEditItem = (id) => {
    openModal(MODAL_TYPES.EDIT, id);
  };

  // Mark an item as leftover - caps shelf life at 4 days per FDA guidelines
  const handleMarkAsLeftover = (id) => {
    const grocery = getGroceryById(id);
    if (!grocery) {
      toast.error('Item not found');
      return;
    }

    // Calculate new expiry date: today + 4 days (FDA guideline for leftovers)
    const today = new Date();
    const newExpiryDate = new Date(today);
    newExpiryDate.setDate(newExpiryDate.getDate() + 4);
    const expiryDateString = newExpiryDate.toISOString().split('T')[0];

    const result = updateGrocery(id, {
      category: 'leftovers',
      foodType: 'leftover',
      expiryDate: expiryDateString,
      shelfLifeDays: 4,
      daysUntilExpiry: 4,
      status: 'fresh',
      source: 'FDA (leftover guideline)',
      storageRecommendations: 'Refrigerate promptly. Use within 3-4 days. Reheat to 165°F (74°C) before eating.',
    });

    if (result.success) {
      toast.success('Marked as leftover - use within 4 days');
    } else {
      toast.error(result.error);
    }
  };

  const handleSaveEdit = (updatedData) => {
    const result = updateGrocery(modalId, updatedData);
    if (result.success) {
      toast.success('Item updated');
      closeModal();
    } else {
      toast.error(result.error);
    }
  };

  // Add single item with AI
  const handleAddGroceryWithAI = async (itemName) => {
    if (!itemName.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/get-shelf-life', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemName: itemName.trim() })
      });

      if (!response.ok) throw new Error('Failed to get shelf life');

      const shelfLifeData = await response.json();
      setPendingData(prev => ({ ...prev, groceryItem: shelfLifeData }));
      openModal(MODAL_TYPES.GROCERY_POPUP);
    } catch {
      toast.error('Could not get shelf life information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmGroceryItem = (groceryData) => {
    // API already provides daysUntilExpiry and status
    const result = addGrocery(groceryData);

    if (result.success) {
      toast.success('Item added to fridge!');
      setPendingData(prev => ({ ...prev, groceryItem: null }));
      closeModal();
    } else {
      toast.error(result.error);
    }
  };

  // Batch add
  const handleBatchSubmit = async (itemNames) => {
    if (!itemNames || itemNames.length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/parse-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemNames })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to parse items');
      }

      const parseResult = await response.json();
      setPendingData(prev => ({ ...prev, batchResult: parseResult }));
      openModal(MODAL_TYPES.BATCH_POPUP);
    } catch (error) {
      toast.error(getUserFriendlyMessage(error, 'parse-items'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmBatchItems = (itemsToAdd) => {
    // API already provides daysUntilExpiry and status
    const result = addBatch(itemsToAdd, 'manual');

    if (result.success) {
      toast.success(`${result.count} items added to fridge!`);
      setPendingData(prev => ({ ...prev, batchResult: null }));
      closeModal();
    } else {
      toast.error(result.error);
    }
  };

  // Receipt upload
  const handleReceiptAnalyzed = (result) => {
    setPendingData(prev => ({ ...prev, documentResult: result }));
    openModal(MODAL_TYPES.DOCUMENT_POPUP);
  };

  const handleConfirmDocumentItems = (itemsToAdd) => {
    // API already provides daysUntilExpiry and status
    const storeName = pendingData.documentResult?.storeName || null;
    const result = addBatch(itemsToAdd, 'receipt', storeName);

    if (result.success) {
      toast.success(`${result.count} items added from receipt!`);
      setPendingData(prev => ({ ...prev, documentResult: null }));
      closeModal();
    } else {
      toast.error(result.error);
    }
  };

  // Manual add without AI
  const handleAddGrocery = (newGrocery) => {
    const result = addGrocery({
      ...newGrocery,
      daysUntilExpiry: calculateDaysUntilExpiry(newGrocery.expiryDate),
      status: getExpiryStatus(calculateDaysUntilExpiry(newGrocery.expiryDate))
    });

    if (result.success) {
      toast.success('Item added!');
      closeModal();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="min-h-[calc(100dvh-64px)] bg-slate-900 flex flex-col"
    >
      <div className="flex-1 flex max-w-4xl w-full mx-auto">
        {/* Open Door Edge with Handle - LEFT side */}
        <Link
          href="/"
          className="w-12 sm:w-14 bg-slate-500 flex flex-col items-center justify-center relative group hover:bg-slate-400 transition-colors shadow-lg"
          aria-label="Close fridge"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-slate-600 to-slate-500" />
          <div className="absolute inset-y-0 right-0 w-1.5 bg-gradient-to-l from-slate-400/50 to-transparent" />
          <div
            className="relative w-3 h-28 sm:h-32 rounded-full bg-slate-300 group-hover:bg-slate-200 transition-colors"
            style={{
              boxShadow: "inset 1px 0 3px rgba(0,0,0,0.3), -1px 0 2px rgba(255,255,255,0.2), 2px 0 8px rgba(0,0,0,0.2)"
            }}
          />
          <span className="absolute bottom-6 text-[10px] text-slate-300 opacity-60 group-hover:opacity-100 transition-opacity -rotate-90 origin-center whitespace-nowrap font-medium">
            Close
          </span>
        </Link>

        {/* Fridge Interior */}
        <div className="flex-1 flex flex-col bg-gradient-to-b from-slate-100 to-slate-200 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-3 bg-gradient-to-l from-slate-300 to-transparent z-0" />

          {/* Top bar */}
          <div className="relative z-10 flex items-center gap-2 px-4 py-3 bg-slate-200/80 backdrop-blur-sm">
            <Link
              href="/"
              className="px-3 py-2 text-slate-600 hover:text-slate-800 hover:bg-white/50 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </Link>
            <div className="flex-1 text-center">
              <span className="text-sm font-medium text-slate-500">My Kitchen</span>
            </div>
            {groceries.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
                title="Delete all items"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear
              </button>
            )}
            <Link
              href="/add"
              className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
              </svg>
              Add
            </Link>
          </div>

          {/* Main content - always show shelves */}
          <div className="flex-1 overflow-auto relative z-10">
            <KitchenContents
              groceries={groceries}
              onItemClick={handleItemClick}
              onMarkAsEaten={handleMarkAsEaten}
              onDeleteItem={handleDeleteItem}
              onChangeLocation={handleChangeLocation}
            />
          </div>

          {/* Bottom Navigation */}
          <div className="relative z-20 flex items-center justify-around py-2 px-4 bg-white/90 backdrop-blur-sm border-t border-slate-200">
            <Link
              href="/"
              className="flex flex-col items-center gap-1 px-4 py-2 text-slate-500 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-xs font-medium">Home</span>
            </Link>

            <Link
              href="/add"
              className="flex flex-col items-center gap-1 px-4 py-2 -mt-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v12m6-6H6" />
              </svg>
            </Link>

            <Link
              href="/tracking"
              className="flex flex-col items-center gap-1 px-4 py-2 text-slate-500 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-xs font-medium">History</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={isModalOpen(MODAL_TYPES.ADD_FORM)}
        onClose={closeModal}
        title="Add New Grocery"
        size="md"
      >
        <AddGroceryForm
          onSubmit={handleAddGrocery}
          onSubmitWithAI={handleAddGroceryWithAI}
          onCancel={closeModal}
          isLoadingShelfLife={isLoading}
        />
      </Modal>

      <Modal
        isOpen={isModalOpen(MODAL_TYPES.BATCH_FORM)}
        onClose={closeModal}
        size="lg"
      >
        <BatchAddGroceryForm
          onBatchSubmit={handleBatchSubmit}
          onCancel={closeModal}
          isLoadingShelfLife={isLoading}
        />
      </Modal>

      <Modal
        isOpen={isModalOpen(MODAL_TYPES.DOCUMENT_UPLOAD)}
        onClose={closeModal}
        title="Take a Photo of Receipt"
        size="lg"
      >
        <ReceiptUpload
          onReceiptAnalyzed={handleReceiptAnalyzed}
          onClose={closeModal}
          showToast={toast.showToast}
        />
      </Modal>

      {isModalOpen(MODAL_TYPES.GROCERY_POPUP) && pendingData.groceryItem && (
        <GroceryItemPopup
          item={pendingData.groceryItem}
          onConfirm={handleConfirmGroceryItem}
          onCancel={() => {
            setPendingData(prev => ({ ...prev, groceryItem: null }));
            closeModal();
          }}
        />
      )}

      {isModalOpen(MODAL_TYPES.BATCH_POPUP) && pendingData.batchResult && (
        <BatchGroceryPopup
          batchResult={pendingData.batchResult}
          onConfirm={handleConfirmBatchItems}
          onCancel={() => {
            setPendingData(prev => ({ ...prev, batchResult: null }));
            closeModal();
          }}
        />
      )}

      {isModalOpen(MODAL_TYPES.DOCUMENT_POPUP) && pendingData.documentResult && (
        <DocumentAnalysisPopup
          analysisResult={pendingData.documentResult}
          onConfirm={handleConfirmDocumentItems}
          onCancel={() => {
            setPendingData(prev => ({ ...prev, documentResult: null }));
            closeModal();
          }}
        />
      )}

      {isModalOpen(MODAL_TYPES.EDIT) && selectedGrocery && (
        <EditGroceryModal
          grocery={selectedGrocery}
          onSave={handleSaveEdit}
          onCancel={closeModal}
        />
      )}

      {isModalOpen(MODAL_TYPES.DETAIL) && selectedGrocery && (
        <GroceryDetailModal
          grocery={selectedGrocery}
          isOpen={true}
          onEdit={handleEditItem}
          onDelete={handleDeleteItem}
          onMarkAsEaten={handleMarkAsEaten}
          onMarkAsLeftover={handleMarkAsLeftover}
          onChangeLocation={handleChangeLocation}
          onClose={closeModal}
        />
      )}

      <ConfirmationModal
        isOpen={isModalOpen(MODAL_TYPES.CLEAR_CONFIRM)}
        onClose={closeModal}
        onConfirm={handleConfirmClearAll}
        title="Delete All Groceries?"
        message="Are you sure you want to delete all groceries? This action cannot be undone."
        confirmText="Delete All"
        cancelText="Cancel"
        variant="danger"
      />
    </motion.div>
  );
}
