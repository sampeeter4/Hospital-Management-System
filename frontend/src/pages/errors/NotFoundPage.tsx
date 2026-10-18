import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FileQuestion, ArrowLeft, Home } from 'lucide-react'
import { Button } from '../../components/ui'

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mb-4">
        <FileQuestion className="w-8 h-8 text-slate-600" aria-hidden="true" />
      </div>

      <span className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
        Error 404
      </span>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
        Page Not Found
      </h1>
      <p className="mt-2 text-xs text-slate-500 max-w-sm leading-relaxed">
        The requested medical record, resource, or hospital URL does not exist or may have been relocated.
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

export default NotFoundPage

