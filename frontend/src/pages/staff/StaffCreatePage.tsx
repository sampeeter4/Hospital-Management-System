import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hospitalApi } from '../../services/api/hospitalApi'
import { StaffInput, Hospital, Department, UserAccountOption } from '../../types/hospitals'
import { PageHeader, FormSection } from '../../components/ui'

const staffSchema = z.object({
  user: z.number().min(1, 'Please select a system user account'),
  hospital: z.number().min(1, 'Please select a hospital facility'),
  department: z.number().nullable().optional(),
  employee_id: z.string().min(3, 'Employee ID is required (e.g. EMP-001)'),
  designation: z.string().min(2, 'Job designation is required'),
  joining_date: z.string().min(10, 'Joining date is required (YYYY-MM-DD)'),
  is_active: z.boolean(),
})

type StaffFormData = z.infer<typeof staffSchema>

export const StaffCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const preselectedHosp = searchParams.get('hospital')

  const [selectedHospitalId, setSelectedHospitalId] = useState<number | undefined>(
    preselectedHosp ? Number(preselectedHosp) : undefined
  )

  // Fetch Hospitals
  const { data: hospitals = [] } = useQuery<Hospital[], Error>({
    queryKey: ['hospitals'],
    queryFn: () => hospitalApi.getHospitals(),
  })

  // Fetch Departments
  const { data: departments = [] } = useQuery<Department[], Error>({
    queryKey: ['departments', { hospital: selectedHospitalId }],
    queryFn: () =>
      hospitalApi.getDepartments(selectedHospitalId ? { hospital: selectedHospitalId } : undefined),
  })

  // Fetch Available Users
  const { data: users = [] } = useQuery<UserAccountOption[], Error>({
    queryKey: ['users'],
    queryFn: () => hospitalApi.getUsers(),
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      user: undefined,
      hospital: preselectedHosp ? Number(preselectedHosp) : undefined,
      department: null,
      employee_id: '',
      designation: '',
      joining_date: new Date().toISOString().split('T')[0],
      is_active: true,
    },
  })

  const handleHospitalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedHospitalId(val ? Number(val) : undefined)
  }

  const createMutation = useMutation({
    mutationFn: (data: StaffInput) => hospitalApi.createStaff(data),
    onSuccess: (newStaff) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      navigate(`/staff/${newStaff.id}`)
    },
  })

  const onSubmit = (formData: StaffFormData) => {
    createMutation.mutate({
      ...formData,
      department: formData.department ? Number(formData.department) : null,
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Add Staff Member"
        subtitle="Record employment details, designations and department assignments"
        backTo="/staff"
        backLabel="Back to Staff Directory"
      />

      {createMutation.isError && (
        <div className="p-4 mb-5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to register staff record: {createMutation.error.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <FormSection
          title="User Account & Employment Identity"
          description="Link staff profile to a system login account and assign employee number"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="staff-user" className="block text-xs font-semibold text-slate-700 mb-1">
                System User Account *
              </label>
              <select
                id="staff-user"
                {...register('user', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">Select User Account...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} — {u.role} ({u.email || 'No email'})
                  </option>
                ))}
              </select>
              {errors.user && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.user.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="staff-emp-id" className="block text-xs font-semibold text-slate-700 mb-1">
                Employee Identification ID *
              </label>
              <input
                id="staff-emp-id"
                type="text"
                {...register('employee_id')}
                placeholder="e.g. EMP-2026-NUR-012"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
              {errors.employee_id && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.employee_id.message}</p>
              )}
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Facility, Department & Designation"
          description="Operational workplace assignment and official job designation"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="staff-hospital" className="block text-xs font-semibold text-slate-700 mb-1">
                Hospital Facility *
              </label>
              <select
                id="staff-hospital"
                {...register('hospital', { valueAsNumber: true, onChange: handleHospitalChange })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Hospital...</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
              {errors.hospital && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.hospital.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="staff-department" className="block text-xs font-semibold text-slate-700 mb-1">
                Department (Optional)
              </label>
              <select
                id="staff-department"
                {...register('department', { setValueAs: (v) => (v ? Number(v) : null) })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">General / Central Administration</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="staff-joining-date" className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Joining *
              </label>
              <input
                id="staff-joining-date"
                type="date"
                {...register('joining_date')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
              {errors.joining_date && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.joining_date.message}</p>
              )}
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="staff-designation" className="block text-xs font-semibold text-slate-700 mb-1">
                Official Designation *
              </label>
              <input
                id="staff-designation"
                type="text"
                {...register('designation')}
                placeholder="e.g. Senior Charge Nurse / Front Desk Receptionist / Chief Pharmacist"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.designation && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.designation.message}</p>
              )}
            </div>
          </div>
        </FormSection>

        <div className="flex items-center justify-end gap-3 pt-2 mb-10">
          <button
            type="button"
            onClick={() => navigate('/staff')}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {createMutation.isPending ? 'Registering...' : 'Save & Register Staff Member'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default StaffCreatePage
