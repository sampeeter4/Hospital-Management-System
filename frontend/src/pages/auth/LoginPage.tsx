import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, AlertCircle, Clock } from 'lucide-react'
import axios from 'axios'
import { Button, Input } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'

// Zod Schema for Login Validation
const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Email or username is required')
    .min(3, 'Username must be at least 3 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean(),
})

type LoginFormValues = z.infer<typeof loginSchema>

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()

  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isSessionExpired = searchParams.get('expired') === '1'
  const redirectTarget = searchParams.get('redirect') || '/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
      rememberMe: false,
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      // Connect to real Django JWT login endpoint via AuthContext
      await login({
        username: data.username.trim(),
        password: data.password,
      })

      // Navigate to destination on success
      navigate(redirectTarget, { replace: true })
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          setErrorMessage(
            'Cannot reach the hospital backend server. Please verify network connectivity.'
          )
        } else if (err.response.status === 401) {
          setErrorMessage(
            'Invalid username/email or password. Please verify your credentials and try again.'
          )
        } else if (err.response.status === 400) {
          setErrorMessage('Please provide both username/email and password.')
        } else if (err.response.status >= 500) {
          setErrorMessage(
            'The hospital authentication service encountered an error. Please contact IT support.'
          )
        } else {
          setErrorMessage('Authentication failed. Please check your credentials.')
        }
      } else {
        setErrorMessage('An unexpected error occurred during sign in.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Staff Sign In</h2>
        <p className="text-xs text-slate-500 mt-1">
          Access hospital departments, clinical charts, and operational controls.
        </p>
      </div>

      {/* Session Expired Notice */}
      {isSessionExpired && (
        <div
          role="status"
          className="mb-5 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2"
        >
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Your session has expired. Please sign in again to continue.</span>
        </div>
      )}

      {/* Backend Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-5 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Authentication Failed</span>
            <span className="text-[11px] text-rose-700 leading-relaxed block mt-0.5">
              {errorMessage}
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Username / Email Field */}
        <div>
          <Input
            id="username"
            type="text"
            label="Email or Username"
            required
            autoComplete="username"
            placeholder="doctor@hospital.org or dr_sharma"
            leftIcon={<Mail className="w-4 h-4" />}
            error={errors.username?.message}
            {...register('username')}
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

        {/* Remember Me & Help Links */}
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
              alert(
                'Password reset requests should be directed to the Hospital Systems Administrator.'
              )
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

        {/* Role Demo Tip */}
        <div className="mt-4 p-3 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
          <span className="font-semibold text-slate-700 block mb-1">Configured Staff Credentials:</span>
          <div className="space-y-0.5">
            <div>• Doctor: <code className="text-slate-800">doctor@hospital.org</code> / <code className="text-slate-800">DoctorPassword123</code></div>
            <div>• Admin: <code className="text-slate-800">admin@hospital.com</code> / <code className="text-slate-800">AdminPassword123</code></div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default LoginPage
