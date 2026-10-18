import React from 'react'
import { Outlet } from 'react-router-dom'
import { Building2, Shield } from 'lucide-react'

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white shadow-xs mb-3">
          <Building2 className="w-7 h-7" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Hospital Management System
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Secure Clinical, Patient & Administrative Portal
        </p>
      </div>

      {/* Main Auth Container */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 border border-slate-200 rounded-lg shadow-xs">
          <Outlet />
        </div>

        {/* Security / Compliance Footer */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <span>HIPAA / DISHA Compliant Healthcare Platform</span>
        </div>
      </div>
    </div>
  )
}

export default AuthLayout

