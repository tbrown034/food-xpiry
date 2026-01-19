'use client';

import { createContext, useContext, useCallback, useState } from 'react';

const ModalContext = createContext(null);

// Modal types - matches original MODAL_TYPES
export const MODAL_TYPES = {
  NONE: null,
  ADD_FORM: 'add-form',
  BATCH_FORM: 'batch-form',
  DOCUMENT_UPLOAD: 'document-upload',
  GROCERY_POPUP: 'grocery-popup',
  BATCH_POPUP: 'batch-popup',
  DOCUMENT_POPUP: 'document-popup',
  EDIT: 'edit',
  DETAIL: 'detail',
  CLEAR_CONFIRM: 'clear-confirm',
};

export function ModalProvider({ children }) {
  // Use useState instead of URL search params
  // This avoids browser history pollution and removes need for Suspense
  const [modalState, setModalState] = useState({
    type: MODAL_TYPES.NONE,
    id: null,
  });

  // Open modal by updating state
  const openModal = useCallback((type, id = null) => {
    setModalState({ type, id });
  }, []);

  // Close modal by resetting state
  const closeModal = useCallback(() => {
    setModalState({ type: MODAL_TYPES.NONE, id: null });
  }, []);

  // Check if a specific modal is open
  const isModalOpen = useCallback((type) => {
    return modalState.type === type;
  }, [modalState.type]);

  const value = {
    modalType: modalState.type,
    modalId: modalState.id,
    openModal,
    closeModal,
    isModalOpen,
    MODAL_TYPES,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
