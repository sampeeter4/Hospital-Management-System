import React from 'react'
import { NavLink } from 'react-router-dom'
import { Building2, X, LogOut } from 'lucide-react'
import { NAVIGATION_CONFIG } from '../../constants/navigationConfig'
import { useAuth } from '../../hooks/useAuth'
import { ROLE_LABELS } from '../../constants/roles'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { role, logout } = useAuth()

  // Filter navigation items by authenticated user role
  const visibleNavItems = NAVIGATION_CONFIG.filter(
    (item) => !role || item.allowedRoles.includes(role)
  )

  return (
    <>
      {/* Mobile backdrop with accessible overlay */}
      {isOpen && (
        <div
          role="presentation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-300
          flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out
          lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Main Hospital Navigation"
      >
        {/* Hospital Branding Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
              <Building2 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight">MetroCare HMS</span>
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                Hospital System
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation sidebar"
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            {role ? ROLE_LABELS[role] : 'Hospital Navigation'}
          </div>

          <nav className="space-y-0.5" aria-label="Module Navigation Links">
            {visibleNavItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => {
                    if (window.innerWidth < 1024) onClose()
                  }}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors
                    ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs font-semibold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 truncate">{item.name}</span>
                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-200">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Bottom Actions & Sign Out */}
        <div className="p-3 border-t border-slate-800 space-y-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 1024) onClose()
              logout()
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            <span>Sign Out</span>
          </button>

          <div className="pt-2 border-t border-slate-850 text-[11px] text-slate-500 flex items-center justify-between px-1">
            <span>v1.0 • Phase 3 Shell</span>
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Secured
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
