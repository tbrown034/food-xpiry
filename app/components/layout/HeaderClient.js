"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

// Theme definitions for landing vs fridge pages
const landingTheme = {
  header: {
    backgroundColor: 'var(--color-cream-50)',
    boxShadow: 'var(--shadow-sm)',
    borderBottom: '1px solid var(--color-cream-200)',
  },
  logo: {
    background: 'linear-gradient(145deg, var(--color-sage-400), var(--color-sage-600))',
    boxShadow: 'var(--shadow-sm)',
  },
  logoIconColor: 'white',
  logoTextColor: 'var(--color-cream-800)',
  hamburgerColor: 'var(--color-cream-700)',
  menuBgOpen: 'var(--color-cream-200)',
  menuBgClosed: 'var(--color-cream-100)',
  dropdownBg: {
    backgroundColor: 'var(--color-cream-50)',
    borderBottom: '1px solid var(--color-cream-200)',
  },
  dividerColor: 'var(--color-cream-200)',
  navButton: (active) => ({
    background: active ? 'var(--color-sage-600)' : 'var(--color-sage-100)',
    color: active ? 'white' : 'var(--color-sage-700)',
  }),
  dropdownPrimary: (active) => ({
    background: active ? 'var(--color-sage-600)' : 'var(--color-sage-50)',
    color: active ? 'white' : 'var(--color-sage-700)',
  }),
  dropdownPrimaryIcon: (active) => ({
    backgroundColor: active ? 'rgba(255,255,255,0.2)' : 'var(--color-sage-100)',
  }),
  secondaryLink: (active) => ({
    color: active ? 'var(--color-cream-900)' : 'var(--color-cream-700)',
    backgroundColor: active ? 'var(--color-cream-100)' : 'transparent',
  }),
};

const fridgeTheme = {
  header: {
    background: "linear-gradient(180deg, #64748b 0%, #475569 50%, #334155 100%)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
  },
  logo: {
    background: 'linear-gradient(145deg, #94a3b8 0%, #64748b 50%, #475569 100%)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
  },
  logoIconColor: 'rgba(226,232,240,1)',
  logoTextColor: 'rgba(255,255,255,0.9)',
  hamburgerColor: 'rgba(255,255,255,0.8)',
  menuBgOpen: 'rgba(0,0,0,0.2)',
  menuBgClosed: 'rgba(255,255,255,0.1)',
  dropdownBg: {
    background: "linear-gradient(180deg, #475569 0%, #334155 100%)",
  },
  dividerColor: 'rgba(100,116,139,0.5)',
  navButton: (active, variant) => {
    const colors = variant === 'add'
      ? { gradient: '#f59e0b, #d97706', rgba: '251, 191, 36', shadow: '245, 158, 11' }
      : { gradient: '#0ea5e9, #0284c7', rgba: '56, 189, 248', shadow: '14, 165, 233' };
    return {
      background: active
        ? `linear-gradient(145deg, ${colors.gradient})`
        : `rgba(${colors.rgba}, 0.15)`,
      color: active ? 'white' : `rgba(${colors.rgba}, 0.9)`,
      boxShadow: active ? `0 2px 8px rgba(${colors.shadow}, 0.4)` : 'none',
    };
  },
  dropdownPrimary: (active, variant) => {
    const colors = variant === 'add'
      ? { gradient: '#f59e0b, #d97706', rgba: '251, 191, 36' }
      : { gradient: '#0ea5e9, #0284c7', rgba: '56, 189, 248' };
    return {
      background: active ? `linear-gradient(145deg, ${colors.gradient})` : `rgba(${colors.rgba}, 0.1)`,
      color: active ? 'white' : `rgba(${colors.rgba}, 0.95)`,
    };
  },
  dropdownPrimaryIcon: (_active, variant) => ({
    backgroundColor: variant === 'add' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(56, 189, 248, 0.2)',
  }),
  secondaryLink: (active) => ({
    color: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)',
    backgroundColor: active ? 'rgba(0,0,0,0.2)' : 'transparent',
  }),
};

export default function HeaderClient() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const isLandingPage = pathname === '/' || pathname === '/about'
  const theme = isLandingPage ? landingTheme : fridgeTheme;

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  const isActive = (path) => pathname === path

  return (
    <>
      <header
        className="sticky top-0 z-50"
        style={theme.header}
      >
        {/* Brushed steel texture - only on non-landing pages */}
        {!isLandingPage && (
          <>
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255,255,255,0.03) 1px, rgba(255,255,255,0.03) 2px)`
              }}
            />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-400/50 to-transparent" />
          </>
        )}

        <div className="container-default relative">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group min-h-[44px]">
              <div
                className="w-9 h-9 rounded-md flex items-center justify-center"
                style={theme.logo}
              >
                <svg
                  className="w-5 h-5 group-hover:scale-105 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: theme.logoIconColor }}
                >
                  <rect x="5" y="2" width="14" height="20" rx="2" />
                  <line x1="5" y1="9" x2="19" y2="9" />
                  <line x1="14" y1="5" x2="14" y2="7" />
                  <line x1="14" y1="12" x2="14" y2="15" />
                </svg>
              </div>
              <span
                className="text-lg font-medium hidden sm:block"
                style={{ color: theme.logoTextColor }}
              >
                Food Xpiry
              </span>
            </Link>

            {/* Main Navigation */}
            <nav className="flex items-center gap-2">
              {/* Add Items Button */}
              <Link
                href="/add"
                className="flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg transition-all cursor-pointer"
                style={theme.navButton(isActive('/add'), 'add')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="text-sm font-semibold hidden sm:block">Add</span>
              </Link>

              {/* My Fridge Button */}
              <Link
                href="/fridge"
                className="flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg transition-all cursor-pointer"
                style={theme.navButton(isActive('/fridge'), 'fridge')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <rect x="5" y="2" width="14" height="20" rx="2" />
                  <line x1="5" y1="9" x2="19" y2="9" />
                </svg>
                <span className="text-sm font-semibold hidden sm:block">Fridge</span>
              </Link>

              {/* Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg transition-colors duration-150 flex items-center justify-center"
                style={{
                  backgroundColor: isMobileMenuOpen ? theme.menuBgOpen : theme.menuBgClosed
                }}
                aria-label="Toggle menu"
                aria-expanded={isMobileMenuOpen}
              >
                <div className="w-5 h-5 relative">
                  <span
                    className="absolute block h-0.5 w-full transition-all duration-200 rounded-full"
                    style={{
                      backgroundColor: theme.hamburgerColor,
                      transform: isMobileMenuOpen ? "rotate(45deg)" : "none",
                      top: isMobileMenuOpen ? "9px" : "3px"
                    }}
                  />
                  <span
                    className="absolute block h-0.5 w-full top-[9px] transition-opacity duration-200 rounded-full"
                    style={{
                      backgroundColor: theme.hamburgerColor,
                      opacity: isMobileMenuOpen ? 0 : 1
                    }}
                  />
                  <span
                    className="absolute block h-0.5 w-full transition-all duration-200 rounded-full"
                    style={{
                      backgroundColor: theme.hamburgerColor,
                      transform: isMobileMenuOpen ? "rotate(-45deg)" : "none",
                      top: isMobileMenuOpen ? "9px" : "15px"
                    }}
                  />
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Bottom edge */}
        {!isLandingPage && (
          <div className="absolute inset-x-0 bottom-0 h-px bg-black/30" />
        )}
      </header>

      {/* Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div
            className="absolute top-16 left-0 right-0 shadow-xl animate-fade-up"
            style={theme.dropdownBg}
          >
            <nav className="container-default py-3">
              <div className="flex flex-col gap-1">
                {/* Primary actions */}
                <Link
                  href="/add"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-4 rounded-xl font-semibold transition-all min-h-[56px]"
                  style={theme.dropdownPrimary(isActive('/add'), 'add')}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={theme.dropdownPrimaryIcon(isActive('/add'), 'add')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-base">Add Items</div>
                    <div className="text-xs opacity-70 font-normal">Track with smart expiry dates</div>
                  </div>
                </Link>

                <Link
                  href="/fridge"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-4 rounded-xl font-semibold transition-all min-h-[56px]"
                  style={theme.dropdownPrimary(isActive('/fridge'), 'fridge')}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={theme.dropdownPrimaryIcon(isActive('/fridge'), 'fridge')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <rect x="5" y="2" width="14" height="20" rx="2" />
                      <line x1="5" y1="9" x2="19" y2="9" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-base">My Fridge</div>
                    <div className="text-xs opacity-70 font-normal">View items & expiring soon</div>
                  </div>
                </Link>

                {/* Divider */}
                <div className="h-px my-2" style={{
                  backgroundColor: theme.dividerColor
                }} />

                {/* Secondary links */}
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[48px]"
                  style={theme.secondaryLink(isActive('/'))}
                >
                  <svg className="w-5 h-5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                  Home
                </Link>

                <Link
                  href="/about"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[48px]"
                  style={theme.secondaryLink(isActive('/about'))}
                >
                  <svg className="w-5 h-5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  About
                </Link>

                <Link
                  href="/tracking"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[48px]"
                  style={theme.secondaryLink(isActive('/tracking'))}
                >
                  <svg className="w-5 h-5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                  Stats
                </Link>
              </div>
            </nav>
            {/* Bottom edge */}
            {!isLandingPage && <div className="h-px bg-black/30" />}
          </div>
        </div>
      )}
    </>
  )
}
