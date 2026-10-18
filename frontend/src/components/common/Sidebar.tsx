import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Pill,
  FlaskConical,
  Bed,
  CreditCard,
  BarChart3,
  ShieldCheck,
  Building2,
  X,
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Patients', href: '/patients', icon: Users },
  { name: 'Appointments', href: '/appointments', icon: Calendar },
  { name: 'Medical Records', href: '/medical-records', icon: FileText },
  { name: 'Pharmacy', href: '/pharmacy', icon: Pill },
  { name: 'Laboratory', href: '/laboratory', icon: FlaskConical },
  { name: 'Inpatient', href: '/inpatient', icon: Bed },
  { name: 'Billing', href: '/billing', icon: CreditCard },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Administration', href: '/admin', icon: ShieldCheck },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile backdrop */}
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
      >
        {/* Hospital Branding Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
              <Building2 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight">MetroCare HMS</span>
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-medium">Hospital System</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Clinical & Management
          </div>

          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => {
                    // Close sidebar on mobile after navigating
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

        {/* System Version & Hospital Scope Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 flex items-center justify-between">
          <span>v1.0 • Phase 1 Core</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Online
          </span>
        </div>
      </aside>
    </>
  )
}

export default Sidebar

