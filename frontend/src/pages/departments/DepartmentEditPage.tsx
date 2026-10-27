import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hospitalApi } from '../../services/api/hospitalApi'
import { DepartmentInput, Hospital } from '../../types/hospitals'
import { PageHeader, FormSection } from '../../components/ui'

const departmentSchema = z.object({
  hospital: z.number().min(1, 'Please select a hospital facility'),
  name: z.string().min(2, 'Department name is required'),
  code: z.string().min(2, 'Department code is required (e.g. CARD, PEDI)'),
  description: z.string().optional(),
  location: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean(),
})

type DepartmentFormData = z.infer<typeof departmentSchema>

export const DepartmentEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch Department
  const { data: department, isLoading: isLoadingDept } = useQuery({
    queryKey: ['departments', id],
    queryFn: () => hospitalApi.getDepartment(id!),
    enabled: !!id,
  })

  // Fetch Hospitals for dropdown
  const { data: hospitals = [] } = useQuery<Hospital[], Error>({
    queryKey: ['hospitals'],
    queryFn: () => hospitalApi.getHospitals(),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      hospital: undefined,
      name: '',
      code: '',
      description: '',
      location: '',
      phone: '',
      is_active: true,
    },
  })

  useEffect(() => {
    if (department) {
      reset({
        hospital: department.hospital,
        name: department.name,
        code: department.code,
        description: department.description || '',
        location: department.location || '',
        phone: department.phone || '',
        is_active: department.is_active,
      })
    }
  }, [department, reset])

  const updateMutation = useMutation({
    mutationFn: (data: Partial<DepartmentInput>) => hospitalApi.updateDepartment(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments', id] })
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      navigate(`/departments/${id}`)
    },
  })

  const onSubmit = (formData: DepartmentFormData) => {
    updateMutation.mutate({
      ...formData,
      description: formData.description || '',
      location: formData.location || '',
      phone: formData.phone || '',
    })
  }

  if (isLoadingDept) {
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
        title={`Edit ${department?.name || 'Department'}`}
        subtitle="Modify departmental clinical scope, location, or facility assignment"
        backTo={`/departments/${id}`}
        backLabel="Back to Department Details"
      />

      {updateMutation.isError && (
        <div className="p-4 mb-5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to update department: {updateMutation.error.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <FormSection
          title="Facility & Department Identification"
          description="Update assigned hospital and unique department code"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dept-hospital-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Hospital Facility *
              </label>
              <select
                id="dept-hospital-edit"
                {...register('hospital', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.city})
                  </option>
                ))}
              </select>
              {errors.hospital && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.hospital.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="dept-code-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Department Code *
              </label>
              <input
                id="dept-code-edit"
                type="text"
                {...register('code')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase font-mono"
              />
              {errors.code && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.code.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="dept-name-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Department Name *
              </label>
              <input
                id="dept-name-edit"
                type="text"
                {...register('name')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.name && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="dept-desc-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Description
              </label>
              <textarea
                id="dept-desc-edit"
                rows={2}
                {...register('description')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Location & Contact"
          description="Floor position and direct telephone extension"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dept-loc-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Floor / Wing
              </label>
              <input
                id="dept-loc-edit"
                type="text"
                {...register('location')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="dept-ph-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Extension
              </label>
              <input
                id="dept-ph-edit"
                type="text"
                {...register('phone')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Operational Status"
          description="Toggle whether this department is active for clinical scheduling"
        >
          <div className="flex items-center gap-3">
            <input
              id="dept_is_active"
              type="checkbox"
              {...register('is_active')}
              className="h-4 w-4 rounded-xs border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="dept_is_active" className="text-xs font-semibold text-slate-800 cursor-pointer">
              Department is active
            </label>
          </div>
        </FormSection>

        <div className="flex items-center justify-end gap-3 pt-2 mb-10">
          <button
            type="button"
            onClick={() => navigate(`/departments/${id}`)}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || updateMutation.isPending}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving Changes...' : 'Save Department Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default DepartmentEditPage
