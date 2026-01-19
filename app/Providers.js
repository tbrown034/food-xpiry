'use client';

import { GroceryProvider, ToastProvider, ModalProvider } from './context';

export default function Providers({ children }) {
  return (
    <GroceryProvider>
      <ToastProvider>
        <ModalProvider>
          {children}
        </ModalProvider>
      </ToastProvider>
    </GroceryProvider>
  );
}
