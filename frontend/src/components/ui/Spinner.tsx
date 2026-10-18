import React from 'react'
import { Loader2 } from 'lucide-react'

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'blue' | 'slate' | 'white'
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'blue',
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10',
  }

  const colorStyles = {
    blue: 'text-blue-600',
    slate: 'text-slate-500',
    white: 'text-white',
  }

  return (
    <Loader2
      role="status"
      aria-label="Loading..."
      className={`animate-spin ${sizeStyles[size]} ${colorStyles[color]} ${className}`}
      {...props}
    />
  )
}

export default Spinner

