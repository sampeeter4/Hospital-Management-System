import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import {
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react'
import { authApi } from '../../services/api/authApi'
import { PageHeader, Card, Button } from '../../components/ui'

const passwordSchema = z
  .object({
    old_password: z.string().min(1, 'Current password is required'),
    new_password: z
      .string()
      .min(8, 'New password must be at least 8 characters long'),
    confirm_password: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'New passwords do not match',
    path: ['confirm_password'],
  })

type PasswordFormData = z.infer<typeof passwordSchema>

export const SecuritySettingsPage: React.FC = () => {
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  })

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordFormData) =>
      authApi.changePassword({
        old_password: data.old_password,
        new_password: data.new_password,
      }),
    onSuccess: (res) => {
      setSuccessMessage(res.message || 'Password updated successfully.')
      setErrorMessage(null)
      reset()
      setTimeout(() => setSuccessMessage(null), 5000)
    },
    onError: (err: unknown) => {
      let msg = 'Failed to change password. Please verify your current password.'
      if (err && typeof err === 'object' && 'response' in err) {
        const res = (err as { response?: { data?: { old_password?: string[]; message?: string } } }).response
        if (res?.data?.old_password?.[0]) {
          msg = res.data.old_password[0]
        } else if (res?.data?.message) {
          msg = res.data.message
        }
      }
      setErrorMessage(msg)
      setSuccessMessage(null)
    },
  })

  const onSubmit = (data: PasswordFormData) => {
    passwordMutation.mutate(data)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Security & Password Settings"
        subtitle="Manage your credentials, password security, and active hospital session protection"
      />

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-3 text-emerald-800 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-md flex items-center gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Security Status Box */}
      <Card className="p-6 bg-slate-900 text-white border-slate-800">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-600/30 border border-blue-500/40 rounded-lg text-blue-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white">HIPAA-Compliant Access Protection</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Your hospital access session is protected by automated JWT token rotation.
              Password changes terminate active mobile and auxiliary web sessions immediately upon rotation.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Token Encryption: HS256 JWT
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Audit Logging: Active
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Change Password Form */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900">Change Account Password</h3>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Current Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showOldPassword ? 'text' : 'password'}
                {...register('old_password')}
                placeholder="Enter current password"
                className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.old_password && (
              <p className="text-[11px] text-rose-600 mt-1">{errors.old_password.message}</p>
            )}
          </div>

          <div className="pt-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                {...register('new_password')}
                placeholder="Minimum 8 characters"
                className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.new_password && (
              <p className="text-[11px] text-rose-600 mt-1">{errors.new_password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                {...register('confirm_password')}
                placeholder="Re-enter new password"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            {errors.confirm_password && (
              <p className="text-[11px] text-rose-600 mt-1">{errors.confirm_password.message}</p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <Button
              type="submit"
              disabled={passwordMutation.isPending}
              className="flex items-center gap-1.5"
            >
              <KeyRound className="w-4 h-4" />
              <span>{passwordMutation.isPending ? 'Updating...' : 'Update Password'}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default SecuritySettingsPage

