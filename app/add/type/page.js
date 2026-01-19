'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGroceries, useToast, useModal, MODAL_TYPES } from '../../context';
import BatchGroceryPopup from '../../components/modals/BatchGroceryPopup';
import { getUserFriendlyMessage } from '../../../lib/errorHandling';
import { calculateDaysUntilExpiry, getExpiryStatus } from '../../../lib/utils';

export default function TypeItemsPage() {
  const router = useRouter();
  const { addBatch } = useGroceries();
  const toast = useToast();
  const { openModal, closeModal, isModalOpen } = useModal();

  const [lines, setLines] = useState(['']);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingBatchResult, setPendingBatchResult] = useState(null);
  const inputRefs = useRef([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleLineChange = (index, value) => {
    const newLines = [...lines];
    newLines[index] = value;
    setLines(newLines);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newLines = [...lines];
      newLines.splice(index + 1, 0, '');
      setLines(newLines);
      setTimeout(() => {
        inputRefs.current[index + 1]?.focus();
      }, 0);
    } else if (e.key === 'Backspace' && lines[index] === '' && lines.length > 1) {
      e.preventDefault();
      const newLines = lines.filter((_, i) => i !== index);
      setLines(newLines);
      setTimeout(() => {
        inputRefs.current[Math.max(0, index - 1)]?.focus();
      }, 0);
    } else if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowDown' && index < lines.length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste - split on newlines so each line becomes a separate item
  const handlePaste = (index, e) => {
    const pastedText = e.clipboardData.getData('text');

    // Check if paste contains newlines (handle both \n and \r\n)
    if (pastedText.includes('\n') || pastedText.includes('\r')) {
      e.preventDefault();

      // Split by any newline variant, trim, and filter empty lines
      const pastedLines = pastedText
        .split(/\r?\n|\r/)
        .map(line => line.trim())
        .filter(line => line !== '');

      if (pastedLines.length > 0) {
        const newLines = [...lines];
        // Replace current line with first pasted line
        newLines[index] = pastedLines[0];
        // Insert remaining lines after current
        for (let i = 1; i < pastedLines.length; i++) {
          newLines.splice(index + i, 0, pastedLines[i]);
        }
        setLines(newLines);

        // Focus the last added line
        setTimeout(() => {
          inputRefs.current[index + pastedLines.length - 1]?.focus();
        }, 0);
      }
    }
  };

  const handleSubmit = async () => {
    const items = lines.filter((line) => line.trim() !== '');
    if (items.length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/parse-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to parse items');
      }

      const parseResult = await response.json();
      setPendingBatchResult(parseResult);
      openModal(MODAL_TYPES.BATCH_POPUP);
    } catch (error) {
      toast.error(getUserFriendlyMessage(error, 'parse-items'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmBatchItems = (itemsToAdd) => {
    const result = addBatch(itemsToAdd.map(item => ({
      ...item,
      daysUntilExpiry: calculateDaysUntilExpiry(item.expiryDate),
      status: getExpiryStatus(calculateDaysUntilExpiry(item.expiryDate))
    })), 'manual');

    if (result.success) {
      toast.success(`${result.count} items added to fridge!`);
      setPendingBatchResult(null);
      setLines(['']); // Clear input after successful add
      closeModal();
      router.push('/fridge');
    } else {
      toast.error(result.error);
    }
  };

  // Count total items including comma-separated items within lines
  const countItems = () => {
    let count = 0;
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed) {
        // Count comma-separated items
        const items = trimmed.split(',').map(s => s.trim()).filter(s => s !== '');
        count += items.length;
      }
    });
    return count;
  };

  const itemCount = countItems();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-500 via-slate-600 to-slate-700 relative overflow-hidden">
      {/* Metallic texture */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255,255,255,0.02) 1px, rgba(255,255,255,0.02) 2px)`,
        }}
      />
      {/* Light reflection */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(160deg, rgba(255,255,255,0.08) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.05) 100%)',
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: 'inset 0 0 80px rgba(0,0,0,0.12)' }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col px-4 sm:px-6 md:px-10">
        {/* Back button */}
        <div className="pt-4">
          <Link
            href="/add"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white py-2 px-3 -ml-3 rounded-lg hover:bg-white/10 active:bg-white/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="font-medium">Back</span>
          </Link>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col justify-center py-6 overflow-hidden">
          <div className="w-full max-w-lg mx-auto flex flex-col h-full max-h-[600px]">
            {/* Notebook */}
            <div
              className="relative flex-1 flex flex-col"
              style={{ transform: 'rotate(-0.5deg)' }}
            >
              {/* Shadow */}
              <div className="absolute inset-0 bg-black/30 rounded translate-y-2 translate-x-1" />

              {/* Notebook paper */}
              <div className="relative flex-1 flex flex-col bg-white rounded shadow-xl overflow-hidden">
                {/* Red margin line */}
                <div className="absolute left-10 sm:left-12 top-0 bottom-0 w-px bg-red-300" />

                {/* Spiral binding holes */}
                <div className="absolute left-2 top-0 bottom-0 w-4 flex flex-col justify-around py-4">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-full bg-slate-200 border-2 border-slate-300"
                    />
                  ))}
                </div>

                {/* Header area */}
                <div className="pl-14 sm:pl-16 pr-4 pt-4 pb-2 border-b border-blue-100">
                  <h2 className="text-lg font-semibold text-slate-700">
                    Shopping List
                  </h2>
                  <p className="text-xs text-slate-400">
                    Type items or paste a list
                  </p>
                </div>

                {/* Lines area - scrollable */}
                <div className="flex-1 overflow-y-auto pl-14 sm:pl-16 pr-4 py-2">
                  {lines.map((line, index) => (
                    <div
                      key={index}
                      className="relative flex items-center border-b border-blue-100"
                      style={{ minHeight: '36px' }}
                    >
                      {/* Line number */}
                      <span className="absolute -left-8 text-xs text-slate-300 w-6 text-right">
                        {index + 1}
                      </span>

                      {/* Input */}
                      <input
                        ref={(el) => (inputRefs.current[index] = el)}
                        type="text"
                        value={line}
                        onChange={(e) => handleLineChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={(e) => handlePaste(index, e)}
                        placeholder={index === 0 ? 'milk, eggs, bread...' : ''}
                        className="w-full py-2 bg-transparent text-slate-700 placeholder-slate-300 focus:outline-none text-sm sm:text-base"
                        style={{ fontFamily: "'Patrick Hand', cursive, sans-serif" }}
                      />
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="pl-14 sm:pl-16 pr-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {itemCount} item{itemCount !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={handleSubmit}
                    disabled={itemCount === 0 || isLoading}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <svg
                          className="w-4 h-4 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        Add to Fridge
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Batch popup modal */}
      {isModalOpen(MODAL_TYPES.BATCH_POPUP) && pendingBatchResult && (
        <BatchGroceryPopup
          batchResult={pendingBatchResult}
          onConfirm={handleConfirmBatchItems}
          onCancel={() => {
            setPendingBatchResult(null);
            closeModal();
          }}
        />
      )}
    </div>
  );
}
