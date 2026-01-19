"use client";

import { useState, useRef, useEffect } from "react";
import { Magnet } from "../svg";

export default function TypeItemsPage({ onSubmit, onBack, isLoading }) {
  const [lines, setLines] = useState([""]);
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
    if (e.key === "Enter") {
      e.preventDefault();
      // Add new line below current
      const newLines = [...lines];
      newLines.splice(index + 1, 0, "");
      setLines(newLines);
      // Focus new line after render
      setTimeout(() => {
        inputRefs.current[index + 1]?.focus();
      }, 0);
    } else if (e.key === "Backspace" && lines[index] === "" && lines.length > 1) {
      e.preventDefault();
      // Remove empty line and focus previous
      const newLines = lines.filter((_, i) => i !== index);
      setLines(newLines);
      setTimeout(() => {
        inputRefs.current[Math.max(0, index - 1)]?.focus();
      }, 0);
    } else if (e.key === "ArrowUp" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowDown" && index < lines.length - 1) {
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

      // Get cursor position to handle paste at correct location
      const input = inputRefs.current[index];
      const cursorPos = input?.selectionStart || 0;
      const currentLine = lines[index];
      const beforeCursor = currentLine.slice(0, cursorPos);
      const afterCursor = currentLine.slice(cursorPos);

      // Split by any newline variant, trim each line
      const pastedLines = pastedText
        .split(/\r?\n|\r/)
        .map(line => line.trim())
        .filter(line => line !== '');

      if (pastedLines.length > 0) {
        const newLines = [...lines];

        // First line: combine text before cursor + first pasted line
        newLines[index] = (beforeCursor + pastedLines[0]).trim();

        // Middle lines: insert as-is
        for (let i = 1; i < pastedLines.length; i++) {
          newLines.splice(index + i, 0, pastedLines[i]);
        }

        // Last line: if there was text after cursor, append it to the last pasted line
        if (afterCursor.trim()) {
          const lastIndex = index + pastedLines.length - 1;
          newLines[lastIndex] = (newLines[lastIndex] + ' ' + afterCursor).trim();
        }

        setLines(newLines);

        // Focus the last added line
        setTimeout(() => {
          inputRefs.current[index + pastedLines.length - 1]?.focus();
        }, 0);
      }
    }
  };

  const handleSubmit = () => {
    const items = lines.filter((line) => line.trim() !== "");
    if (items.length > 0) {
      onSubmit(items);
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
      {/* Ambient light reflection at top */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />

      {/* Subtle brushed metal texture */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255,255,255,0.1) 1px, rgba(255,255,255,0.1) 2px)`
      }} />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col px-4 sm:px-6">
        {/* Back button */}
        <div className="pt-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-white/80 hover:text-white py-2.5 px-3 -ml-3 rounded-xl hover:bg-white/10 active:bg-white/15 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium text-sm">Back</span>
          </button>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col justify-center py-6 overflow-hidden">
          <div className="w-full max-w-lg mx-auto flex flex-col h-full max-h-[600px]">
            {/* Notebook with premium styling */}
            <div className="relative flex-1 flex flex-col" style={{ transform: "rotate(-0.5deg)" }}>
              {/* Blue magnet at top */}
              <Magnet
                color="blue"
                size={28}
                className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 drop-shadow-lg"
              />

              {/* Soft shadow with blur */}
              <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-black/30 rounded-xl translate-y-2 blur-md" />

              {/* Notebook paper with glass effect */}
              <div className="relative flex-1 flex flex-col rounded-xl overflow-hidden shadow-xl">
                {/* Base white */}
                <div className="absolute inset-0 bg-white" />

                {/* Glass shine overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-transparent" />

                {/* Red margin line */}
                <div className="absolute left-10 sm:left-12 top-0 bottom-0 w-px bg-red-300/70" />

                {/* Spiral binding holes */}
                <div className="absolute left-2 top-0 bottom-0 w-4 flex flex-col justify-around py-4">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-full bg-slate-100 border-2 border-slate-200 shadow-inner"
                    />
                  ))}
                </div>

                {/* Header area */}
                <div className="relative pl-14 sm:pl-16 pr-4 pt-5 pb-3 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800 tracking-tight">What I Bought</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Type items or paste a list</p>
                </div>

                {/* Lines area - scrollable */}
                <div className="relative flex-1 overflow-y-auto pl-14 sm:pl-16 pr-4 py-2">
                  {lines.map((line, index) => (
                    <div
                      key={index}
                      className="relative flex items-center border-b border-blue-50"
                      style={{ minHeight: "40px" }}
                    >
                      {/* Line number */}
                      <span className="absolute -left-8 text-xs text-slate-300 w-6 text-right font-medium">
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
                        placeholder={index === 0 ? "milk, eggs, bread..." : ""}
                        className="w-full py-2 bg-transparent text-slate-700 placeholder-slate-300 focus:outline-none text-sm sm:text-base"
                        style={{ fontFamily: "'Patrick Hand', cursive, sans-serif" }}
                      />
                    </div>
                  ))}
                </div>

                {/* Footer with premium button */}
                <div className="relative pl-14 sm:pl-16 pr-4 py-3 bg-slate-50/80 backdrop-blur-sm border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">
                    {itemCount} item{itemCount !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={handleSubmit}
                    disabled={itemCount === 0 || isLoading}
                    className="relative group px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-all disabled:cursor-not-allowed active:scale-[0.98] flex items-center gap-2 shadow-lg"
                  >
                    {/* Button background with glow */}
                    <div className={`absolute inset-0 rounded-xl ${itemCount === 0 || isLoading ? 'bg-slate-300' : 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 group-hover:from-emerald-500 group-hover:to-emerald-700'} transition-all`} />
                    <div className={`absolute inset-0 rounded-xl ring-1 ${itemCount === 0 || isLoading ? 'ring-slate-400/20' : 'ring-white/20'}`} />

                    {/* Button content */}
                    <span className="relative flex items-center gap-2">
                      {isLoading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          Add to Fridge
                          <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
