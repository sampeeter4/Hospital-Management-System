import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hospitalApi } from '../../services/api/hospitalApi'
import { StaffInput, Hospital, Department } from '../../types/hospitals'
import { PageHeader, FormSection } from '../../components/ui'

const staffSchema = z.object({
  user: z.number(),
  hospital: z.number().min(1, 'Please select a hospital facility'),
  department: z.number().nullable().optional(),
  employee_id: z.string().min(3, 'Employee ID is required'),
  designation: z.string().min(2, 'Job designation is required'),
  joining_date: z.string().min(10, 'Joining date is required (YYYY-MM-DD)'),
  is_active: z.boolean(),
})

type StaffFormData = z.infer<typeof staffSchema>

export const StaffEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch Staff
  const { data: staff, isLoading: isLoadingStaff } = useQuery({
    queryKey: ['staff', id],
    queryFn: () => hospitalApi.getStaff(id!),
    enabled: !!id,
  })

  // Fetch Hospitals
  const { data: hospitals = [] } = useQuery<Hospital[], Error>({
    queryKey: ['hospitals'],
    queryFn: () => hospitalApi.getHospitals(),
  })

  // Fetch Departments
  const { data: departments = [] } = useQuery<Department[], Error>({
    queryKey: ['departments'],
    queryFn: () => hospitalApi.getDepartments(),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      user: 0,
      hospital: 0,
      department: null,
      employee_id: '',
      designation: '',
      joining_date: '',
      is_active: true,
    },
  })

  useEffect(() => {
    if (staff) {
      reset({
        user: staff.user,
        hospital: staff.hospital,
        department: staff.department || null,
        employee_id: staff.employee_id,
        designation: staff.designation,
        joining_date: staff.joining_date,
        is_active: staff.is_active,
      })
    }
  }, [staff, reset])

  const updateMutation = useMutation({
    mutationFn: (data: Partial<StaffInput>) => hospitalApi.updateStaff(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', id] })
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      navigate(`/staff/${id}`)
    },
  })

  const onSubmit = (formData: StaffFormData) => {
    updateMutation.mutate({
      ...formData,
      department: formData.department ? Number(formData.department) : null,
    })
  }

  if (isLoadingStaff) {
    return (
      <div className="max-w-4xl mx-auto p-8 animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-48 bg-slate-100 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title={`Edit ${staff?.staff_name || 'Staff Record'}`}
        subtitle="Update employee designation, department, and operational status"
        backTo={`/staff/${id}`}
        backLabel="Back to Staff Record"
      />

      {updateMutation.isError && (
        <div className="p-4 mb-5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to update staff record: {updateMutation.error.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <FormSection
          title="Facility & Employment Identity"
          description="Employee number and assigned hospital facility"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="staff-emp-id-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Employee Identification ID *
              </label>
              <input
                id="staff-emp-id-edit"
                type="text"
                {...register('employee_id')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
              {errors.employee_id && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.employee_id.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="staff-hospital-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Hospital Facility *
              </label>
              <select
                id="staff-hospital-edit"
                {...register('hospital', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Department & Designation"
          description="Workplace department assignment, official designation and joining date"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="staff-dept-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Department
              </label>
              <select
                id="staff-dept-edit"
                {...register('department', { setValueAs: (v) => (v ? Number(v) : null) })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">General / Central Admin</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="staff-desig-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Official Designation *
              </label>
              <input
                id="staff-desig-edit"
                type="text"
                {...register('designation')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.designation && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.designation.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="staff-date-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Joining Date *
              </label>
              <input
                id="staff-date-edit"
                type="date"
                {...register('joining_date')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div className="sm:col-span-3">
              <div className="flex items-center gap-3">
                <input
                  id="staff-active-edit"
                  type="checkbox"
                  {...register('is_active')}
                  className="h-4 w-4 rounded-xs border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="staff-active-edit" className="text-xs font-semibold text-slate-800 cursor-pointer">
                  Staff member is active and currently employed
                </label>
              </div>
            </div>
          </div>
        </FormSection>

        <div className="flex items-center justify-end gap-3 pt-2 mb-10">
          <button
            type="button"
            onClick={() => navigate(`/staff/${id}`)}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || updateMutation.isPending}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving Changes...' : 'Save Staff Record'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default StaffEditPage
