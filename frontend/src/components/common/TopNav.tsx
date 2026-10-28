import React, { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, Search, Bell, User as UserIcon, LogOut, Shield, KeyRound, LayoutGrid, Sun, Moon } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useNotifications } from '../../hooks/dashboard/useNotifications'
import { useTheme } from '../../hooks/useTheme'
import { ROLE_LABELS, ROLES } from '../../constants/roles'

interface TopNavProps {
  onToggleSidebar: () => void
  pageTitle?: string
}

export const TopNav: React.FC<TopNavProps> = ({
  onToggleSidebar,
  pageTitle,
}) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, role, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const { theme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const displayName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.username || 'Staff User'

  // Derive breadcrumb & page title dynamically
  const resolvedPageTitle =
    pageTitle ||
    formatPathTitle(location.pathname) ||
    'Hospital Overview'

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 transition-colors">
      {/* Left side: Hamburger button (mobile) & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Open sidebar navigation"
          className="lg:hidden text-slate-600 hover:text-slate-900 p-1.5 rounded-md hover:bg-slate-100 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 hidden sm:inline">Hospital</span>
          <span className="text-xs text-slate-300 hidden sm:inline">/</span>
          <h1 className="text-sm font-bold text-slate-900 truncate">{resolvedPageTitle}</h1>
        </div>
      </div>

      {/* Middle/Right: Quick Search, Notifications & Staff Profile Dropdown */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Search placeholder */}
        <div className="relative hidden md:block w-64 lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search patient MRN, doctor, test..."
            aria-label="Search hospital records"
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
          />
        </div>

        {/* Dark Mode Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {/* Notifications Icon with Real Unread Count Badge */}
        <button
          type="button"
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
          className="relative text-slate-500 hover:text-slate-700 p-2 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          onClick={() => navigate('/notifications')}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          )}
        </button>

        {/* Staff / Profile Menu with dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-label="User profile menu"
            className="flex items-center gap-2.5 pl-2 border-l border-slate-200 hover:opacity-90 focus:outline-none cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-semibold text-xs">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <span className="block text-xs font-semibold text-slate-800 leading-tight truncate max-w-[140px]">
                {displayName}
              </span>
              <span className="block text-[10px] text-slate-500 leading-tight">
                {role ? ROLE_LABELS[role] : 'Medical Staff'}
              </span>
            </div>
          </button>

          {/* Profile Dropdown Menu */}
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-md py-1.5 z-50 text-xs animate-in fade-in-50 duration-100">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="font-semibold text-slate-900 truncate">{displayName}</p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{user?.email || 'No email configured'}</p>
                <div className="mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-100">
                  <Shield className="w-3 h-3 text-blue-500" />
                  <span>{role ? ROLE_LABELS[role] : 'Hospital Staff'}</span>
                </div>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    navigate('/settings/profile')
                  }}
                  className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Profile Settings</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    navigate('/settings/security')
                  }}
                  className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  <span>Security & Password</span>
                </button>

                {(role === ROLES.SUPER_ADMIN || role === ROLES.HOSPITAL_ADMIN) && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      navigate('/admin')
                    }}
                    className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
                    <span>Administration Hub</span>
                  </button>
                )}
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    logout()
                  }}
                  className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function formatPathTitle(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean)[0]
  if (!segment) return 'Dashboard'
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default TopNav
