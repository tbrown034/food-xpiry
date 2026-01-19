"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { storage } from "@/lib/storage";
import { getFoodEmoji } from "@/lib/foodEmojis";

export default function HistoryPage() {
  const [groceries, setGroceries] = useState([]);
  const [activeTab, setActiveTab] = useState('eaten');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = () => {
    try {
      storage.saveGroceries([]);
      setGroceries([]);
      setShowResetConfirm(false);
    } catch {
      // Handle error silently
    }
  };

  // Load groceries from localStorage
  useEffect(() => {
    const loadData = () => {
      try {
        const stored = storage.getGroceries();
        setGroceries(stored);
      } catch {
        // Handle error silently
      }
    };

    loadData();
    // Refresh every minute
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filter items by status
  const { eatenItems, expiredItems, stats } = useMemo(() => {
    const eaten = groceries.filter(g => g.eaten);
    const expired = groceries.filter(g => g.markedExpired || (g.daysUntilExpiry < 0 && !g.eaten));

    // Calculate stats
    const totalAdded = groceries.length;
    const eatenCount = eaten.length;
    const expiredCount = expired.length;
    const wasteRate = totalAdded > 0 ? Math.round((expiredCount / totalAdded) * 100) : 0;

    return {
      eatenItems: eaten.sort((a, b) => new Date(b.eatenAt || 0) - new Date(a.eatenAt || 0)),
      expiredItems: expired.sort((a, b) => new Date(b.expiryDate) - new Date(a.expiryDate)),
      stats: { totalAdded, eatenCount, expiredCount, wasteRate }
    };
  }, [groceries]);

  const currentItems = activeTab === 'eaten' ? eatenItems : expiredItems;

  // Format date nicely
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-500 via-slate-600 to-slate-700 relative overflow-hidden">
      {/* Metallic texture */}
      <div className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255,255,255,0.02) 1px, rgba(255,255,255,0.02) 2px)` }}
      />
      {/* Light reflection */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.08) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.05) 100%)' }}
      />

      {/* Content */}
      <div className="relative z-10 px-4 sm:px-6 py-6 max-w-2xl mx-auto">
        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/90 hover:text-white py-2 px-3 -ml-3 rounded-lg hover:bg-white/10 active:bg-white/20 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">Back</span>
        </Link>

        {/* Stats sticky note */}
        <div className="mt-6 relative" style={{ transform: 'rotate(-0.5deg)' }}>
          <div className="absolute inset-0 bg-black/25 rounded-sm translate-y-2 translate-x-1" />
          <div className="relative bg-gradient-to-br from-green-100 via-green-50 to-emerald-50 rounded-sm p-5 shadow-lg">
            {/* Green magnet */}
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full"
              style={{
                background: 'radial-gradient(circle at 30% 30%, #4ade80 0%, #22c55e 50%, #15803d 100%)',
                boxShadow: '0 3px 6px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.4)',
              }}
            />

            <div className="flex items-center justify-between pt-2 mb-4">
              <h2 className="font-bold text-slate-800">Your Food Stats</h2>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-white/60 rounded-lg p-3">
                <div className="text-2xl font-bold text-slate-800">{stats.totalAdded}</div>
                <div className="text-xs text-slate-500">Total Added</div>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <div className="text-2xl font-bold text-emerald-600">{stats.eatenCount}</div>
                <div className="text-xs text-slate-500">Eaten</div>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <div className="text-2xl font-bold text-red-500">{stats.expiredCount}</div>
                <div className="text-xs text-slate-500">Wasted</div>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <div className="text-2xl font-bold text-amber-600">{stats.wasteRate}%</div>
                <div className="text-xs text-slate-500">Waste Rate</div>
              </div>
            </div>

            {stats.wasteRate === 0 && stats.eatenCount > 0 && (
              <p className="text-center text-sm text-emerald-600 mt-3 font-medium">
                Perfect! No food wasted!
              </p>
            )}

            {/* Reset confirmation */}
            {showResetConfirm && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-700 text-center mb-2">
                  Clear all items and reset stats?
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3 py-1.5 text-sm text-slate-600 hover:bg-white rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History list */}
        <div className="mt-6 relative" style={{ transform: 'rotate(0.3deg)' }}>
          <div className="absolute inset-0 bg-black/25 rounded-sm translate-y-2 translate-x-1" />
          <div className="relative bg-gradient-to-br from-yellow-100 via-yellow-50 to-amber-50 rounded-sm shadow-lg overflow-hidden">
            {/* Yellow magnet */}
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full z-10"
              style={{
                background: 'radial-gradient(circle at 30% 30%, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                boxShadow: '0 3px 6px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.4)',
              }}
            />

            {/* Tabs */}
            <div className="flex border-b border-amber-200 pt-5">
              <button
                onClick={() => setActiveTab('eaten')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'eaten'
                    ? 'text-emerald-700 border-b-2 border-emerald-500 bg-white/30'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Eaten ({eatenItems.length})
              </button>
              <button
                onClick={() => setActiveTab('expired')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'expired'
                    ? 'text-red-700 border-b-2 border-red-500 bg-white/30'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Expired ({expiredItems.length})
              </button>
            </div>

            {/* Items list */}
            <div className="p-4 max-h-[400px] overflow-y-auto">
              {currentItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <div className="text-4xl mb-2">
                    {activeTab === 'eaten' ? '🍽️' : '🗑️'}
                  </div>
                  <p className="text-sm">
                    {activeTab === 'eaten'
                      ? 'No items eaten yet'
                      : 'No expired items - great job!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentItems.map(item => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        activeTab === 'eaten' ? 'bg-emerald-50' : 'bg-red-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <span className="text-xl">{getFoodEmoji(item)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 truncate">{item.name}</div>
                        <div className="text-xs text-slate-500">
                          {activeTab === 'eaten' && item.eatenAt && (
                            <>Eaten {formatDate(item.eatenAt)}</>
                          )}
                          {activeTab === 'expired' && (
                            <>Expired {formatDate(item.expiryDate)}</>
                          )}
                        </div>
                      </div>
                      <div className={`text-lg ${activeTab === 'eaten' ? 'text-emerald-500' : 'text-red-400'}`}>
                        {activeTab === 'eaten' ? '✓' : '✗'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tip note */}
        <div className="mt-6 relative" style={{ transform: 'rotate(-1deg)' }}>
          <div className="absolute inset-0 bg-black/25 rounded-sm translate-y-1 translate-x-0.5" />
          <div className="relative bg-gradient-to-br from-blue-100 via-blue-50 to-sky-50 rounded-sm p-4 shadow-lg">
            <div
              className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full"
              style={{
                background: 'radial-gradient(circle at 30% 30%, #60a5fa 0%, #2563eb 50%, #1e40af 100%)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.4)',
              }}
            />
            <p className="text-center text-sm text-slate-600 pt-2">
              <span className="font-medium">Tip:</span> Mark items as eaten from your fridge view to track your progress!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
