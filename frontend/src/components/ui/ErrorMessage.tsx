import React from 'react'
import { AlertCircle } from 'lucide-react'
import Button from './Button'

export interface ErrorMessageProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'An error occurred',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`rounded-md bg-rose-50 border border-rose-200 p-4 text-rose-800 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold">{title}</h4>
          <p className="text-xs text-rose-700 mt-1 leading-relaxed">{message}</p>
          {onRetry && (
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={onRetry} className="bg-white border-rose-300 text-rose-800 hover:bg-rose-100">
                Try again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ErrorMessage

