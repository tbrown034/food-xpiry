"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGroceries, useToast } from "../../context";
import { getFoodEmoji } from "../../../lib/foodEmojis";

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [fridgeOpening, setFridgeOpening] = useState(false);
  const router = useRouter();
  const { addGrocery } = useGroceries();
  const toast = useToast();
  const searchInputRef = useRef(null);

  // Quick lookup function
  const handleLookup = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setLookupResult(null);

    try {
      const response = await fetch("/api/parse-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [searchQuery.trim()] }),
      });

      if (!response.ok) throw new Error("Lookup failed");

      const data = await response.json();
      if (data.items && data.items.length > 0) {
        setLookupResult(data.items[0]);
      }
    } catch (error) {
      toast.error("Could not look up item. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Add result to fridge
  const handleAddToFridge = () => {
    if (!lookupResult) return;
    addGrocery(lookupResult);
    toast.success(`${lookupResult.name} added to fridge!`);
    setLookupResult(null);
    setSearchQuery("");
    router.push("/fridge");
  };

  // Try again with focus on input
  const handleTryAgain = () => {
    setLookupResult(null);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  // Fridge open transition
  const handleOpenFridge = (e) => {
    e.preventDefault();
    setFridgeOpening(true);
  };

  return (
    <>
      <motion.div
        animate={fridgeOpening ? { opacity: 0, y: -20 } : {}}
        transition={{ duration: 0.45, ease: [0.43, 0.13, 0.23, 0.96] }}
        onAnimationComplete={() => {
          if (fridgeOpening) router.push("/fridge");
        }}
        className="min-h-[calc(100dvh-64px)] flex flex-col"
      >
        {/* Hero Section */}
        <section className="container-default pt-12 sm:pt-20 pb-8 sm:pb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-6"
              style={{
                backgroundColor: "var(--color-sage-100)",
                color: "var(--color-sage-700)",
              }}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
              Powered by USDA data + AI
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.1,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            className="text-display"
            style={{ color: "var(--color-cream-900)" }}
          >
            Stop Wasting
            <br />
            Good{" "}
            <span style={{ color: "var(--color-sage-600)" }}>Food</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.2,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            className="text-body mt-4 max-w-lg mx-auto"
            style={{ color: "var(--color-cream-600)" }}
          >
            Track groceries, get AI-powered shelf life estimates, and stop
            throwing away good food. Built on official USDA FoodKeeper data.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.3,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-sm sm:max-w-none mx-auto"
          >
            <button onClick={handleOpenFridge} className="btn btn-primary btn-lg">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <line x1="5" y1="9" x2="19" y2="9" />
              </svg>
              Open My Fridge
            </button>
            <Link href="/add" className="btn btn-secondary btn-lg">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Add Items
            </Link>
          </motion.div>
        </section>

        {/* Quick Lookup Section */}
        <section className="container-default py-6 sm:py-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.4,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            className="card p-6 sm:p-8 max-w-xl lg:max-w-2xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "var(--color-sage-100)" }}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  style={{ color: "var(--color-sage-600)" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </div>
              <div>
                <h2
                  className="text-title"
                  style={{ color: "var(--color-cream-900)" }}
                >
                  Quick Lookup
                </h2>
                <p
                  className="text-small"
                  style={{ color: "var(--color-cream-500)" }}
                >
                  How long does it last?
                </p>
              </div>
            </div>

            {/* Search Input */}
            <form onSubmit={handleLookup} className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. chicken breast"
                disabled={isSearching}
                className="input input-lg pr-16"
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "var(--color-sage-600)",
                  color: "white",
                }}
                aria-label="Search"
              >
                {isSearching ? (
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
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                )}
              </button>
            </form>

            {/* Result Display */}
            <AnimatePresence>
              {lookupResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{
                    duration: 0.3,
                    ease: [0.34, 1.56, 0.64, 1],
                  }}
                  className="overflow-hidden"
                >
                  <div
                    className="mt-4 rounded-lg p-4"
                    style={{
                      backgroundColor: "var(--color-sage-50)",
                      border: "1px solid var(--color-sage-200)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {getFoodEmoji(lookupResult)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div
                          className="font-semibold text-sm"
                          style={{ color: "var(--color-cream-900)" }}
                        >
                          {lookupResult.name}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--color-cream-500)" }}
                        >
                          {lookupResult.category}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className="text-2xl font-bold"
                          style={{ color: "var(--color-sage-600)" }}
                        >
                          {lookupResult.shelfLifeDays}
                        </div>
                        <div
                          className="text-[11px] font-medium"
                          style={{ color: "var(--color-sage-700)" }}
                        >
                          days fresh
                        </div>
                      </div>
                    </div>

                    {/* Storage tip */}
                    {lookupResult.storageRecommendations && (
                      <div
                        className="mt-3 p-2.5 rounded-md"
                        style={{
                          backgroundColor: "var(--color-butter-50)",
                          border: "1px solid var(--color-butter-200)",
                        }}
                      >
                        <div
                          className="text-[11px] font-semibold mb-0.5"
                          style={{ color: "var(--color-butter-500)" }}
                        >
                          Storage Tip
                        </div>
                        <div
                          className="text-xs line-clamp-2"
                          style={{ color: "var(--color-cream-700)" }}
                        >
                          {lookupResult.storageRecommendations}
                        </div>
                      </div>
                    )}

                    {/* Source */}
                    <div
                      className="mt-2 text-[11px] text-center"
                      style={{ color: "var(--color-cream-500)" }}
                    >
                      Source: {lookupResult.source || "USDA Guidelines"}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleAddToFridge}
                        className="btn btn-primary btn-sm flex-1"
                      >
                        Add to Fridge
                      </button>
                      <button
                        onClick={handleTryAgain}
                        className="btn btn-secondary btn-sm flex-1"
                      >
                        Not Right? Try Again
                      </button>
                    </div>
                    <p
                      className="text-[11px] text-center mt-2"
                      style={{ color: "var(--color-cream-500)" }}
                    >
                      Tip: Be specific like &ldquo;leftover fries&rdquo; or
                      &ldquo;fresh chicken&rdquo;
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </section>

        {/* Data sources strip */}
        <section className="container-default py-4 sm:py-6">
          <div
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-small"
            style={{ color: "var(--color-cream-500)" }}
          >
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "var(--color-sage-500)" }}
              />
              583+ items from USDA FoodKeeper
            </span>
            <span
              className="hidden sm:inline"
              style={{ color: "var(--color-cream-300)" }}
            >
              /
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "var(--color-butter-500)" }}
              />
              AI fallback for unlisted items
            </span>
            <span
              className="hidden sm:inline"
              style={{ color: "var(--color-cream-300)" }}
            >
              /
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "var(--color-tomato-400)" }}
              />
              FDA safety limits for raw meat & leftovers
            </span>
          </div>
        </section>

        {/* CTA + Mini Fridge Preview */}
        <section className="container-default py-8 sm:py-12 text-center">
          {/* Mini fridge illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
            className="mx-auto mb-6 w-36 h-48 rounded-xl shadow-xl relative overflow-hidden"
            style={{
              background:
                "linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 50%, #94a3b8 100%)",
            }}
          >
            {/* Handle */}
            <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-10 rounded-full bg-slate-400/80 shadow-inner" />

            {/* Top compartment */}
            <div className="absolute top-2.5 left-2.5 right-4 h-16 rounded-lg bg-white/90 border border-slate-200/50 p-1.5">
              <div className="flex flex-wrap gap-0.5 justify-center items-end h-full">
                <span className="text-base">🥛</span>
                <span className="text-base">🧀</span>
                <span className="text-base">🥚</span>
                <span className="text-base">🧈</span>
              </div>
              <div className="absolute top-0.5 right-0.5">
                <span className="badge badge-fresh text-[8px] px-1 py-0.5">
                  Fresh
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="absolute top-[4.8rem] left-1.5 right-1.5 h-[2px] bg-slate-300" />

            {/* Bottom compartment */}
            <div className="absolute top-[5rem] left-2.5 right-4 bottom-2.5 rounded-lg bg-white/90 border border-slate-200/50 p-1.5">
              <div className="flex flex-wrap gap-0.5 justify-center items-end h-full">
                <span className="text-base">🥬</span>
                <span className="text-base">🍎</span>
                <span className="text-base">🥩</span>
                <span className="text-base">🫐</span>
              </div>
              <div className="absolute bottom-0.5 right-0.5">
                <span className="badge badge-expiring text-[8px] px-1 py-0.5">
                  2d
                </span>
              </div>
            </div>
          </motion.div>

          <h2
            className="text-headline mb-3"
            style={{ color: "var(--color-cream-800)" }}
          >
            Ready to reduce food waste?
          </h2>
          <p
            className="text-body mb-6"
            style={{ color: "var(--color-cream-600)" }}
          >
            Your smart kitchen companion is waiting.
          </p>
          <button onClick={handleOpenFridge} className="btn btn-primary btn-lg">
            Open My Fridge
          </button>
        </section>

        {/* Footer */}
        <footer
          className="py-6"
          style={{ borderTop: "1px solid var(--color-cream-300)" }}
        >
          <div className="container-default flex items-center justify-between">
            <span
              className="text-micro"
              style={{ color: "var(--color-cream-500)" }}
            >
              &copy; {new Date().getFullYear()} Food Xpiry
            </span>
            <div className="flex items-center gap-4">
              <Link
                href="/about"
                className="text-micro hover:underline"
                style={{ color: "var(--color-cream-600)" }}
              >
                About
              </Link>
              <a
                href="https://github.com/tbrown034/food-xpiry"
                target="_blank"
                rel="noopener noreferrer"
                className="text-micro hover:underline"
                style={{ color: "var(--color-cream-600)" }}
              >
                GitHub
              </a>
            </div>
          </div>
        </footer>
      </motion.div>

      {/* Transition overlay */}
      <AnimatePresence>
        {fridgeOpening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "var(--color-cream-100)" }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
