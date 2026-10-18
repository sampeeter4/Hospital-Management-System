import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react'
import { Button, Input } from '../../components/ui'

// Zod Schema for Login Validation
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean(),
})

type LoginFormValues = z.infer<typeof loginSchema>

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [demoNotice, setDemoNotice] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  })

  const onSubmit = async (_data: LoginFormValues) => {
    setIsSubmitting(true)
    setDemoNotice(null)

    // Phase 1 Foundation: Validate form and demonstrate workflow transition
    // Full JWT integration with backend DRF token endpoints will be connected in Phase 2
    setTimeout(() => {
      setIsSubmitting(false)
      setDemoNotice('Form validation successful. Navigating to Dashboard...')
      setTimeout(() => {
        navigate('/dashboard')
      }, 700)
    }, 600)
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Staff Sign In</h2>
        <p className="text-xs text-slate-500 mt-1">
          Access hospital departments, clinical charts, and operational controls.
        </p>
      </div>

      {demoNotice && (
        <div
          role="status"
          className="mb-5 p-3 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2"
        >
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span>{demoNotice}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Email Field */}
        <div>
          <Input
            id="email"
            type="email"
            label="Email Address"
            required
            autoComplete="email"
            placeholder="doctor@hospital.org"
            leftIcon={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        {/* Password Field */}
        <div>
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            label="Password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded-xs border-slate-300 text-blue-600 focus:ring-blue-500"
              {...register('rememberMe')}
            />
            <span className="text-xs text-slate-600">Remember me</span>
          </label>

          <a
            href="#forgot-password"
            onClick={(e) => {
              e.preventDefault()
              alert('Password reset link will be emailed to your registered staff address.')
            }}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Forgot password?
          </a>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            fullWidth
            isLoading={isSubmitting}
          >
            Sign In to Portal
          </Button>
        </div>

        {/* Phase 1 Notice Box */}
        <div className="mt-4 p-3 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p>
            <strong>Phase 1 Note:</strong> Client-side form validation active via React Hook Form & Zod. Full backend JWT authentication will connect in Frontend Phase 2.
          </p>
        </div>
      </form>
    </div>
  )
}

export default LoginPage

