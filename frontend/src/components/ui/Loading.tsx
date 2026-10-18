import React from 'react'
import Spinner from './Spinner'

export interface LoadingProps {
  message?: string
  fullScreen?: boolean
  className?: string
}

export const Loading: React.FC<LoadingProps> = ({
  message = 'Loading...',
  fullScreen = false,
  className = '',
}) => {
  if (fullScreen) {
    return (
      <div
        role="status"
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-4"
      >
        <div className="bg-white rounded-lg p-6 shadow-md flex flex-col items-center gap-3 border border-slate-200">
          <Spinner size="lg" color="blue" />
          <p className="text-sm font-medium text-slate-700">{message}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center py-12 px-4 gap-3 ${className}`}
    >
      <Spinner size="md" color="blue" />
      {message && <p className="text-xs font-medium text-slate-500">{message}</p>}
    </div>
  )
}

export default Loading

