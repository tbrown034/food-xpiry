"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { springs } from "../../../lib/motionVariants";
import {
  animateMagnetsEntrance,
  createMagnetFloat,
} from "../../../lib/gsapAnimations";
import FreezerDrawer from "../layout/FreezerDrawer";
import { Magnet } from "../svg";
import { useGroceries, useToast } from "../../context";
import { getFoodEmoji } from "../../../lib/foodEmojis";

export default function HomePage() {
  const [isLoaded, setIsLoaded] = useState(true); // Start as true to show content immediately
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const router = useRouter();
  const { addGrocery } = useGroceries();
  const toast = useToast();

  // Refs for magnet animations
  const magnetsRef = useRef([]);
  const floatAnimsRef = useRef([]);

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

  // Clear result
  const handleClearResult = () => {
    setLookupResult(null);
    setSearchQuery("");
  };

  // Try again with focus on input
  const searchInputRef = useRef(null);
  const handleTryAgain = () => {
    setLookupResult(null);
    // Focus the input so user can modify their search
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  // Initialize magnet animations on mount
  useEffect(() => {
    const magnets = magnetsRef.current.filter(Boolean);
    const floatAnims = floatAnimsRef.current;

    if (magnets.length > 0) {
      animateMagnetsEntrance(magnets, { delay: 0.3, stagger: 0.15 });
      magnets.forEach((magnet) => {
        const anim = createMagnetFloat(magnet);
        floatAnims.push(anim);
      });
    }

    return () => {
      floatAnims.forEach(anim => anim?.kill());
    };
  }, []);

  return (
    <div className="min-h-[calc(100dvh-64px)] bg-slate-900 flex flex-col">
      {/* Fridge Door */}
      <div className="flex-1 flex bg-gradient-to-b from-slate-500 via-slate-550 to-slate-600 max-w-4xl w-full mx-auto shadow-2xl relative">

        {/* Ambient light reflection at top */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />

        {/* Subtle brushed metal texture */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{
          backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255,255,255,0.1) 1px, rgba(255,255,255,0.1) 2px)`
        }} />

        {/* Door Content */}
        <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 lg:px-12 mr-10 sm:mr-14 pt-6 pb-24 relative">
          <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto">

            {/* Square Sticky Notes - 2 column grid */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:gap-8">

              {/* Add Items - Yellow Sticky Note */}
              <motion.div
                initial={{ opacity: 0, y: 20, rotate: -3 }}
                animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20, rotate: -2 }}
                transition={{ delay: 0.1, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                whileHover={{ y: -6, scale: 1.03, rotate: 0 }}
                whileTap={{ scale: 0.97 }}
                className="group relative aspect-square"
              >
                <Link href="/add" className="block h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 rounded">
                  {/* Red magnet */}
                  <Magnet
                    ref={el => magnetsRef.current[0] = el}
                    color="red"
                    size={24}
                    className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 drop-shadow-lg"
                  />

                  {/* Shadow */}
                  <div className="absolute inset-0 bg-black/25 rounded-md translate-y-1.5 translate-x-0.5 blur-md group-hover:translate-y-2 transition-all duration-500" />

                  {/* Note */}
                  <div className="relative h-full rounded-md overflow-hidden bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-50 shadow-sm">
                    {/* Shine */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent" />

                    {/* Content */}
                    <div className="relative h-full p-3 sm:p-4 flex flex-col items-center justify-center text-center">
                      {/* Icon */}
                      <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-md mb-2 sm:mb-3">
                        <svg className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </div>
                      <h2 className="text-sm sm:text-base lg:text-lg font-bold text-slate-700">Add Items</h2>
                      <p className="text-slate-500 text-[10px] sm:text-xs lg:text-sm mt-0.5 leading-tight">
                        Track expiry dates
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* My Fridge - Blue Sticky Note */}
              <motion.div
                initial={{ opacity: 0, y: 20, rotate: 3 }}
                animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20, rotate: 2 }}
                transition={{ delay: 0.2, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                whileHover={{ y: -6, scale: 1.03, rotate: 0 }}
                whileTap={{ scale: 0.97 }}
                className="group relative aspect-square"
              >
                <Link href="/fridge" className="block h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 rounded">
                  {/* Blue magnet */}
                  <Magnet
                    ref={el => magnetsRef.current[1] = el}
                    color="blue"
                    size={24}
                    className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 drop-shadow-lg"
                  />

                  {/* Shadow */}
                  <div className="absolute inset-0 bg-black/25 rounded-md translate-y-1.5 -translate-x-0.5 blur-md group-hover:translate-y-2 transition-all duration-500" />

                  {/* Note */}
                  <div className="relative h-full rounded-md overflow-hidden bg-gradient-to-br from-sky-100 via-blue-50 to-sky-50 shadow-sm">
                    {/* Shine */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent" />

                    {/* Content */}
                    <div className="relative h-full p-3 sm:p-4 flex flex-col items-center justify-center text-center">
                      {/* Icon */}
                      <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-md mb-2 sm:mb-3">
                        <svg className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <rect x="4" y="2" width="16" height="20" rx="2" />
                          <line x1="4" y1="10" x2="20" y2="10" />
                        </svg>
                      </div>
                      <h2 className="text-sm sm:text-base lg:text-lg font-bold text-slate-700">My Fridge</h2>
                      <p className="text-slate-500 text-[10px] sm:text-xs lg:text-sm mt-0.5 leading-tight">
                        View your items
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            </div>

            {/* Quick Lookup - Green Sticky Note */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
              className="mt-4 sm:mt-6 lg:mt-8"
            >
              <motion.div
                animate={lookupResult ? { y: -3, scale: 1.01 } : { y: 0, scale: 1 }}
                transition={springs.gentle}
                className="relative"
              >
                {/* Green magnet */}
                <Magnet
                  ref={el => magnetsRef.current[2] = el}
                  color="green"
                  size={24}
                  className="absolute -top-2.5 left-6 z-20 drop-shadow-lg"
                />

                {/* Shadow */}
                <div className="absolute inset-0 bg-black/25 rounded-md translate-y-1.5 blur-md" />

                {/* Note */}
                <div className="relative rounded-md overflow-hidden bg-gradient-to-br from-emerald-100 via-green-50 to-emerald-50 shadow-sm">
                  {/* Shine */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent" />

                  {/* Content */}
                  <div className="relative p-3 sm:p-4 lg:p-5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                      </div>
                      <h2 className="text-sm sm:text-base lg:text-lg font-bold text-slate-700">Quick Lookup</h2>
                    </div>

                    {/* Search Input */}
                    <form onSubmit={handleLookup} className="relative">
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="How long does chicken last?"
                        disabled={isSearching}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-11 sm:pr-12 rounded-lg bg-white/70 border border-emerald-200/60 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 text-slate-700 placeholder:text-slate-400 text-sm sm:text-base transition-all"
                      />
                      <button
                        type="submit"
                        disabled={isSearching || !searchQuery.trim()}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-sm"
                      >
                        {isSearching ? (
                          <svg className="w-3.5 h-3.5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                        )}
                      </button>
                    </form>

                    {/* Result Display */}
                    <AnimatePresence>
                      {lookupResult && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 bg-white/90 rounded-lg p-3 ring-1 ring-emerald-200/50">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{getFoodEmoji(lookupResult)}</span>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-slate-800 text-sm">{lookupResult.name}</div>
                                <div className="text-xs text-slate-500">{lookupResult.category}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-bold text-emerald-600">{lookupResult.shelfLifeDays}</div>
                                <div className="text-[10px] text-emerald-700 font-medium">days fresh</div>
                              </div>
                            </div>

                            {/* Storage tip if available */}
                            {lookupResult.storageRecommendations && (
                              <div className="mt-2 p-2 bg-amber-50 rounded-md border border-amber-200">
                                <div className="text-[10px] font-semibold text-amber-700 mb-0.5">💡 Storage Tip</div>
                                <div className="text-xs text-slate-600 line-clamp-2">{lookupResult.storageRecommendations}</div>
                              </div>
                            )}

                            {/* Source info */}
                            <div className="mt-2 text-[10px] text-slate-400 text-center">
                              Source: {lookupResult.source || 'USDA Guidelines'}
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={handleAddToFridge}
                                className="flex-1 py-2.5 bg-gradient-to-br from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-semibold rounded-md transition-all shadow-sm active:scale-[0.98]"
                              >
                                ✓ Add to Fridge
                              </button>
                              <button
                                onClick={handleTryAgain}
                                className="flex-1 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-semibold rounded-md transition-all active:scale-[0.98] border border-amber-300"
                              >
                                ✗ Not Right? Try Again
                              </button>
                            </div>
                            <p className="text-[10px] text-slate-400 text-center mt-2">
                              Tip: Be specific like &ldquo;leftover fries&rdquo; or &ldquo;fresh chicken&rdquo;
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            </motion.div>

          </div>
        </div>

        {/* Fridge Handle - Right side */}
        <Link
          href="/fridge"
          className="absolute right-3 top-1/2 -translate-y-1/2 group flex items-center gap-2 cursor-pointer z-20"
          aria-label="Open fridge"
        >
          <span className="text-xs text-white/40 group-hover:text-white/70 transition-colors font-medium tracking-wide">
            Open
          </span>
          <div className="relative">
            {/* Handle glow */}
            <div className="absolute inset-0 bg-white/20 rounded-full blur-md group-hover:bg-white/30 transition-all" />
            <div
              className="relative w-3 h-28 sm:h-32 rounded-full bg-gradient-to-b from-slate-300 via-slate-350 to-slate-400 group-hover:from-slate-200 group-hover:to-slate-300 transition-all shadow-xl"
              style={{
                boxShadow: "inset -2px 0 6px rgba(0,0,0,0.3), inset 2px 0 6px rgba(255,255,255,0.1), 0 0 20px rgba(0,0,0,0.3)"
              }}
            />
          </div>
        </Link>

        {/* Freezer Drawer - Bottom Menu */}
        <div className="absolute bottom-0 left-0 right-0 z-30">
          <FreezerDrawer />
        </div>
      </div>
    </div>
  );
}
