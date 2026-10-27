import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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

export const DepartmentCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const preselectedHospital = searchParams.get('hospital')

  // Fetch Hospitals for dropdown
  const { data: hospitals = [], isLoading: isLoadingHospitals } = useQuery<Hospital[], Error>({
    queryKey: ['hospitals'],
    queryFn: () => hospitalApi.getHospitals(),
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      hospital: preselectedHospital ? Number(preselectedHospital) : undefined,
      name: '',
      code: '',
      description: '',
      location: '',
      phone: '',
      is_active: true,
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: DepartmentInput) => hospitalApi.createDepartment(data),
    onSuccess: (newDept) => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      navigate(`/departments/${newDept.id}`)
    },
  })

  const onSubmit = (formData: DepartmentFormData) => {
    createMutation.mutate({
      ...formData,
      description: formData.description || '',
      location: formData.location || '',
      phone: formData.phone || '',
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Add Hospital Department"
        subtitle="Configure a medical specialty, inpatient ward, or administrative unit"
        backTo="/departments"
        backLabel="Back to Departments"
      />

      {createMutation.isError && (
        <div className="p-4 mb-5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to create department: {createMutation.error.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <FormSection
          title="Facility & Department Information"
          description="Assign department to a hospital and define its unique code"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dept-hospital" className="block text-xs font-semibold text-slate-700 mb-1">
                Hospital Facility *
              </label>
              <select
                id="dept-hospital"
                {...register('hospital', { valueAsNumber: true })}
                disabled={isLoadingHospitals}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Hospital Facility...</option>
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
              <label htmlFor="dept-code" className="block text-xs font-semibold text-slate-700 mb-1">
                Department Code *
              </label>
              <input
                id="dept-code"
                type="text"
                {...register('code')}
                placeholder="e.g. CARD, PEDI, ONCO, RAD"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase font-mono"
              />
              {errors.code && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.code.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="dept-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Department Name *
              </label>
              <input
                id="dept-name"
                type="text"
                {...register('name')}
                placeholder="e.g. Department of Cardiology & Cardiac Surgery"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.name && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="dept-desc" className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Scope & Description
              </label>
              <textarea
                id="dept-desc"
                rows={2}
                {...register('description')}
                placeholder="Brief summary of clinical treatments, procedures and patient services handled by this department..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Location & Direct Extension"
          description="Internal floor location and direct telephone contact"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dept-location" className="block text-xs font-semibold text-slate-700 mb-1">
                Floor / Wing / Block
              </label>
              <input
                id="dept-location"
                type="text"
                {...register('location')}
                placeholder="e.g. Building B, 3rd Floor, West Wing"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="dept-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Direct Extension / Phone
              </label>
              <input
                id="dept-phone"
                type="text"
                {...register('phone')}
                placeholder="e.g. Ext. 3401 or +91 11 2345 3401"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </FormSection>

        <div className="flex items-center justify-end gap-3 pt-2 mb-10">
          <button
            type="button"
            onClick={() => navigate('/departments')}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Save & Create Department'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default DepartmentCreatePage
