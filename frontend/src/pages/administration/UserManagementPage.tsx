import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Users,
  UserPlus,
  Search,
  Shield,
  CheckCircle2,
  XCircle,
  Lock,
  User as UserIcon,
  Mail,
  Phone,
  X,
  AlertCircle,
} from 'lucide-react'
import { adminApi } from '../../services/api/adminApi'
import { UserAccount, RegisterUserRequest } from '../../types/admin'
import { PageHeader, Card, Button, DataTable, Column } from '../../components/ui'
import { ROLES, ROLE_LABELS, UserRole } from '../../constants/roles'

const newUserSchema = z
  .object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    email: z.string().email('Please enter a valid email address'),
    phone: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirm: z.string().min(1, 'Please confirm password'),
    role: z.enum([
      ROLES.PATIENT,
      ROLES.DOCTOR,
      ROLES.NURSE,
      ROLES.RECEPTIONIST,
      ROLES.LAB_TECHNICIAN,
      ROLES.PHARMACIST,
      ROLES.ACCOUNTANT,
      ROLES.HOSPITAL_ADMIN,
    ]),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: 'Passwords do not match',
    path: ['password_confirm'],
  })

type NewUserFormData = z.infer<typeof newUserSchema>

export const UserManagementPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [selectedRole, setSelectedRole] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['systemUsers', selectedRole],
    queryFn: () => adminApi.getUsers(selectedRole !== 'ALL' ? { role: selectedRole } : undefined),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewUserFormData>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      role: ROLES.PATIENT,
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: RegisterUserRequest) => adminApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemUsers'] })
      setIsModalOpen(false)
      reset()
      setFeedback({
        type: 'success',
        message: 'User account created successfully.',
      })
      setTimeout(() => setFeedback(null), 4000)
    },
    onError: (err: unknown) => {
      let msg = 'Failed to provision user.'
      if (err && typeof err === 'object' && 'response' in err) {
        const res = (err as { response?: { data?: Record<string, string[]> } }).response
        if (res?.data) {
          const firstKey = Object.keys(res.data)[0]
          if (firstKey && res.data[firstKey]?.[0]) {
            msg = `${firstKey}: ${res.data[firstKey][0]}`
          }
        }
      }
      setFeedback({ type: 'error', message: msg })
    },
  })

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.phone && u.phone.includes(searchQuery))
      return matchSearch
    })
  }, [users, searchQuery])

  const columns: Column<UserAccount>[] = [
    {
      key: 'user',
      header: 'Account / User',
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
            {u.username[0].toUpperCase()}
          </div>
          <div>
            <span className="font-semibold text-slate-900 block">{u.username}</span>
            <span className="text-[11px] text-slate-500 font-mono">{u.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'System Role',
      render: (u) => {
        const roleLabel = ROLE_LABELS[u.role as UserRole] || u.role
        const isStaff = u.role !== ROLES.PATIENT
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
              isStaff
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            <Shield className="w-3 h-3" />
            {roleLabel}
          </span>
        )
      },
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (u) => <span className="text-slate-600">{u.phone || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Verification',
      render: (u) => (
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium ${
            u.is_verified ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          {u.is_verified ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Verified
            </>
          ) : (
            <>
              <XCircle className="w-3.5 h-3.5 text-slate-400" />
              Unverified
            </>
          )}
        </span>
      ),
    },
    {
      key: 'created',
      header: 'Created On',
      render: (u) => (
        <span className="text-slate-500 text-xs">
          {u.date_joined ? new Date(u.date_joined).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
  ]

  const onSubmit = (data: NewUserFormData) => {
    createMutation.mutate(data)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System User Management"
        subtitle="Manage hospital staff credentials, clinical roles, and account provisioning"
        action={
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Provision User</span>
          </Button>
        }
      />

      {feedback && (
        <div
          className={`p-4 rounded-md border flex items-center gap-3 text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search username, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-medium text-slate-600 whitespace-nowrap">Filter Role:</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Roles</option>
              {Object.entries(ROLE_LABELS).map(([roleKey, label]) => (
                <option key={roleKey} value={roleKey}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Users DataTable */}
      <DataTable
        columns={columns}
        data={filteredUsers}
        isLoading={isLoading}
        keyExtractor={(u) => String(u.id)}
        emptyMessage="No system user accounts found matching query."
      />

      {/* Provision User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full p-6 animate-in fade-in-50 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Provision System User</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Username *</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      {...register('username')}
                      placeholder="e.g. jsmith"
                      className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  {errors.username && (
                    <p className="text-[11px] text-rose-600 mt-1">{errors.username.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Role *</label>
                  <select
                    {...register('role')}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={ROLES.PATIENT}>Patient</option>
                    <option value={ROLES.DOCTOR}>Doctor / Physician</option>
                    <option value={ROLES.NURSE}>Nurse</option>
                    <option value={ROLES.RECEPTIONIST}>Receptionist</option>
                    <option value={ROLES.LAB_TECHNICIAN}>Laboratory Technician</option>
                    <option value={ROLES.PHARMACIST}>Pharmacist</option>
                    <option value={ROLES.ACCOUNTANT}>Accountant</option>
                    <option value={ROLES.HOSPITAL_ADMIN}>Hospital Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="user@hospital.org"
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    {...register('phone')}
                    placeholder="+1 555-0199"
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      {...register('password')}
                      placeholder="Min 8 characters"
                      className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-rose-600 mt-1">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      {...register('password_confirm')}
                      placeholder="Re-enter password"
                      className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  {errors.password_confirm && (
                    <p className="text-[11px] text-rose-600 mt-1">{errors.password_confirm.message}</p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Provisioning...' : 'Create Account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagementPage
