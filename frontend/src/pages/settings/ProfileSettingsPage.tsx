import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { authApi } from '../../services/api/authApi'
import { PageHeader, Card, Button } from '../../components/ui'
import { ROLE_LABELS } from '../../constants/roles'

const profileSchema = z.object({
  first_name: z.string().max(150),
  last_name: z.string().max(150),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().max(20),
})

type ProfileFormData = z.infer<typeof profileSchema>

export const ProfileSettingsPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: ProfileFormData) => authApi.updateProfile(data),
    onSuccess: () => {
      setSuccessMessage('Profile information updated successfully.')
      setErrorMessage(null)
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      setTimeout(() => setSuccessMessage(null), 4000)
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.'
      setErrorMessage(msg)
      setSuccessMessage(null)
    },
  })

  const onSubmit = (data: ProfileFormData) => {
    updateMutation.mutate(data)
  }

  const roleName = user?.role ? ROLE_LABELS[user.role] : 'Medical Staff'

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Account Profile Settings"
        subtitle="Review your hospital personnel credentials and update your contact information"
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

      {/* Profile Overview Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center text-blue-700 text-xl font-bold">
              {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  <Shield className="w-3 h-3" />
                  {roleName}
                </span>
                {user?.is_verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">@{user?.username}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 text-xs text-slate-600">
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-md border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="block text-[11px] font-medium text-slate-500">Account Created</span>
              <span className="font-semibold text-slate-800">
                {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-md border border-slate-200">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="block text-[11px] font-medium text-slate-500">Last Active Session</span>
              <span className="font-semibold text-slate-800">
                {user?.last_login ? new Date(user.last_login).toLocaleString() : 'Current Session'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Edit Contact Form */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Personal & Contact Information</h3>
        <p className="text-xs text-slate-500 mb-6">
          System username and clinical role are assigned by hospital administrators and cannot be altered here.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">First Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  {...register('first_name')}
                  placeholder="e.g. Eleanor"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              {errors.first_name && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.first_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  {...register('last_name')}
                  placeholder="e.g. Vance"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              {errors.last_name && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  {...register('email')}
                  placeholder="name@hospital.org"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Contact Phone</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  {...register('phone')}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              {errors.phone && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <Button
              type="submit"
              disabled={!isDirty || updateMutation.isPending}
              className="flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{updateMutation.isPending ? 'Saving...' : 'Save Profile Changes'}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default ProfileSettingsPage
