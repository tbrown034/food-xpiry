'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { USDA_DATA } from '../../../lib/usdaParser';

// Storage badge component
function StorageBadge({ label, value, color }) {
  if (!value) return null;

  const colors = {
    pantry: 'bg-amber-100 text-amber-800 border-amber-200',
    fridge: 'bg-blue-100 text-blue-800 border-blue-200',
    freezer: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium ${colors[color]}`}>
      <span className="opacity-70">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

// Product row component
function ProductRow({ product, isExpanded, onToggle }) {
  const hasTips = product.storage.pantry.tips ||
    product.storage.refrigerator.tips ||
    product.storage.freezer.tips ||
    product.cookingTips.length > 0;

  return (
    <div className={`border-b border-slate-100 ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'} transition-colors`}>
      {/* Main row */}
      <div
        className="px-4 py-3 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-start gap-3">
          {/* Expand icon */}
          <button className="mt-1 text-slate-400 hover:text-slate-600">
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Name and category */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-slate-800 truncate">{product.fullName}</h3>
              {product.isHighRisk && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                  High Risk
                </span>
              )}
              {hasTips && (
                <span className="text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{product.categoryFullName}</div>
          </div>

          {/* Storage times */}
          <div className="flex flex-wrap gap-1.5 justify-end">
            <StorageBadge label="Pantry" value={product.display.pantry} color="pantry" />
            <StorageBadge label="Fridge" value={product.display.refrigerator} color="fridge" />
            <StorageBadge label="Freezer" value={product.display.freezer} color="freezer" />
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 pb-4 pl-11">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Keywords */}
            {product.keywords.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Keywords</h4>
                <div className="flex flex-wrap gap-1">
                  {product.keywords.map((kw, i) => (
                    <span key={i} className="inline-block px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-xs">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed storage info */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Storage Details</h4>
              <div className="space-y-1 text-sm">
                {product.storage.pantry.min && (
                  <div className="text-amber-700">
                    <span className="font-medium">Pantry:</span> {product.display.pantry}
                    {product.storage.pantry.afterOpening.min && (
                      <span className="text-slate-500"> (after opening: {product.storage.pantry.afterOpening.min}-{product.storage.pantry.afterOpening.max} {product.storage.pantry.afterOpening.metric?.toLowerCase()})</span>
                    )}
                  </div>
                )}
                {product.storage.refrigerator.min && (
                  <div className="text-blue-700">
                    <span className="font-medium">Refrigerator:</span> {product.display.refrigerator}
                    {product.storage.refrigerator.afterOpening.min && (
                      <span className="text-slate-500"> (after opening: {product.storage.refrigerator.afterOpening.min}-{product.storage.refrigerator.afterOpening.max} {product.storage.refrigerator.afterOpening.metric?.toLowerCase()})</span>
                    )}
                    {product.storage.refrigerator.afterThawing.min && (
                      <span className="text-slate-500"> (after thawing: {product.storage.refrigerator.afterThawing.min}-{product.storage.refrigerator.afterThawing.max} {product.storage.refrigerator.afterThawing.metric?.toLowerCase()})</span>
                    )}
                  </div>
                )}
                {product.storage.freezer.min && (
                  <div className="text-cyan-700">
                    <span className="font-medium">Freezer:</span> {product.display.freezer}
                  </div>
                )}
              </div>
            </div>

            {/* Tips */}
            {(product.storage.pantry.tips || product.storage.refrigerator.tips || product.storage.freezer.tips) && (
              <div className="md:col-span-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Storage Tips</h4>
                <div className="space-y-1 text-sm text-slate-600">
                  {product.storage.pantry.tips && <p className="flex gap-2"><span className="text-amber-500">Pantry:</span> {product.storage.pantry.tips}</p>}
                  {product.storage.refrigerator.tips && <p className="flex gap-2"><span className="text-blue-500">Fridge:</span> {product.storage.refrigerator.tips}</p>}
                  {product.storage.freezer.tips && <p className="flex gap-2"><span className="text-cyan-500">Freezer:</span> {product.storage.freezer.tips}</p>}
                </div>
              </div>
            )}

            {/* Cooking tips */}
            {product.cookingTips.length > 0 && (
              <div className="md:col-span-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Cooking Safety</h4>
                <div className="space-y-1 text-sm">
                  {product.cookingTips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      {tip.safeMinTemp && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                          {tip.safeMinTemp}°F min
                        </span>
                      )}
                      {tip.tip && <span className="text-slate-600">{tip.tip}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function USDAExplorerPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('name'); // name, fridge, freezer, category
  const [sortOrder, setSortOrder] = useState('asc');
  const [expandedId, setExpandedId] = useState(null);
  const [showHighRiskOnly, setShowHighRiskOnly] = useState(false);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let results = USDA_DATA.products;

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      results = results.filter(p =>
        p.fullName.toLowerCase().includes(searchLower) ||
        p.keywords.some(k => k.toLowerCase().includes(searchLower)) ||
        p.categoryFullName.toLowerCase().includes(searchLower)
      );
    }

    // Filter by category
    if (selectedCategory !== 'All') {
      results = results.filter(p => p.categoryFullName === selectedCategory);
    }

    // Filter high risk only
    if (showHighRiskOnly) {
      results = results.filter(p => p.isHighRisk);
    }

    // Sort
    results = [...results].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.fullName.localeCompare(b.fullName);
          break;
        case 'fridge':
          const aDays = a.fridgeDays ?? 9999;
          const bDays = b.fridgeDays ?? 9999;
          comparison = aDays - bDays;
          break;
        case 'category':
          comparison = a.categoryFullName.localeCompare(b.categoryFullName);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return results;
  }, [search, selectedCategory, sortBy, sortOrder, showHighRiskOnly]);

  // Toggle sort
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Sort button component
  const SortButton = ({ field, label }) => (
    <button
      onClick={() => handleSort(field)}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${sortBy === field
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
    >
      {label}
      {sortBy === field && (
        <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Link>
            <h1 className="text-lg font-semibold text-slate-800">USDA FoodKeeper Explorer</h1>
            <div className="w-16" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Data Source Banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-emerald-800">Official USDA FoodKeeper Data</h2>
              <p className="text-sm text-emerald-700">
                {USDA_DATA.totalItems} items from {USDA_DATA.metadata.source} •{' '}
                <a href={USDA_DATA.metadata.url} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                  View source
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, keyword, or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Filters row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Category filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
              >
                <option value="All">All Categories ({USDA_DATA.totalItems})</option>
                {USDA_DATA.categoriesWithSub.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* High risk toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHighRiskOnly}
                  onChange={(e) => setShowHighRiskOnly(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                />
                <span className="text-sm text-slate-700">High-risk only (≤2 days fridge)</span>
              </label>

              <div className="flex-1" />

              {/* Sort buttons */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Sort by:</span>
                <SortButton field="name" label="Name" />
                <SortButton field="fridge" label="Fridge Time" />
                <SortButton field="category" label="Category" />
              </div>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-slate-500 mb-2 px-1">
          Showing {filteredProducts.length} of {USDA_DATA.totalItems} items
          {showHighRiskOnly && <span className="text-red-600 ml-2">(high-risk filter active)</span>}
        </div>

        {/* Product list */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No items match your filters</p>
            </div>
          ) : (
            filteredProducts.map(product => (
              <ProductRow
                key={product.id}
                product={product}
                isExpanded={expandedId === product.id}
                onToggle={() => setExpandedId(expandedId === product.id ? null : product.id)}
              />
            ))
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Legend</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-md border bg-amber-100 text-amber-800 border-amber-200 text-xs font-medium">Pantry</span>
              <span className="text-slate-600">Room temperature storage</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-md border bg-blue-100 text-blue-800 border-blue-200 text-xs font-medium">Fridge</span>
              <span className="text-slate-600">Refrigerator at 40°F (4°C)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-md border bg-cyan-100 text-cyan-800 border-cyan-200 text-xs font-medium">Freezer</span>
              <span className="text-slate-600">Freezer at 0°F (-18°C)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">High Risk</span>
              <span className="text-slate-600">Safety-critical (≤2 days fridge life)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-slate-500">
          <p>
            Data from{' '}
            <a
              href="https://catalog.data.gov/dataset/fsis-foodkeeper-data"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 hover:underline"
            >
              USDA FSIS FoodKeeper
            </a>
            {' '}• Licensed under CC0 (Public Domain)
          </p>
        </div>
      </div>
    </div>
  );
}
