import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react'
import { Button } from '../../components/ui'

export const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 mb-4">
        <ShieldAlert className="w-8 h-8 text-rose-600" aria-hidden="true" />
      </div>

      <span className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">
        Access Denied • 403
      </span>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
        Permission Required
      </h1>
      <p className="mt-2 text-xs text-slate-500 max-w-sm leading-relaxed">
        You do not have permission to access this page. Please contact your hospital system administrator if you require clinical clearance.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Home className="w-4 h-4" />}
          onClick={() => navigate('/dashboard')}
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  )
}

export default ForbiddenPage

