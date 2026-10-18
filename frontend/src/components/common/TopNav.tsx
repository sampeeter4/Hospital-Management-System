import React from 'react'
import { Menu, Search, Bell, User as UserIcon } from 'lucide-react'

interface TopNavProps {
  onToggleSidebar: () => void
  pageTitle?: string
}

export const TopNav: React.FC<TopNavProps> = ({
  onToggleSidebar,
  pageTitle = 'Hospital Overview',
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Left side: Hamburger button (mobile) & Breadcrumb / Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Open sidebar"
          className="lg:hidden text-slate-600 hover:text-slate-900 p-1.5 rounded-md hover:bg-slate-100"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">Hospital</span>
          <span className="text-xs text-slate-300 hidden sm:inline">/</span>
          <h1 className="text-sm font-semibold text-slate-900 truncate">{pageTitle}</h1>
        </div>
      </div>

      {/* Middle/Right: Quick Search & Staff Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Search placeholder */}
        <div className="relative hidden md:block w-64 lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search patient MRN, doctor, order..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
          />
        </div>

        {/* Notifications Icon Placeholder */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative text-slate-500 hover:text-slate-700 p-2 rounded-md hover:bg-slate-100 transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
        </button>

        {/* Staff / Profile Menu Placeholder */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs">
            <UserIcon className="w-4 h-4 text-slate-500" />
          </div>
          <div className="hidden sm:block text-left">
            <span className="block text-xs font-semibold text-slate-800 leading-tight">
              Hospital Staff
            </span>
            <span className="block text-[10px] text-slate-500 leading-tight">
              Clinical Session
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default TopNav

