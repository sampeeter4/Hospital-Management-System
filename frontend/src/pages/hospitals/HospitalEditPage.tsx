import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hospitalApi } from '../../services/api/hospitalApi'
import { HospitalInput } from '../../types/hospitals'
import { PageHeader, FormSection } from '../../components/ui'

const hospitalSchema = z.object({
  name: z.string().min(2, 'Hospital name is required'),
  registration_number: z.string().min(3, 'Registration number is required'),
  address: z.string().min(5, 'Full street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postal_code: z.string().min(3, 'Postal code is required'),
  phone: z.string().min(7, 'Valid contact phone number is required'),
  email: z.string().email('Valid contact email is required'),
  website: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  is_active: z.boolean(),
})

type HospitalFormData = z.infer<typeof hospitalSchema>

export const HospitalEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: hospital, isLoading: isLoadingHospital } = useQuery({
    queryKey: ['hospitals', id],
    queryFn: () => hospitalApi.getHospital(id!),
    enabled: !!id,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HospitalFormData>({
    resolver: zodResolver(hospitalSchema),
    defaultValues: {
      name: '',
      registration_number: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      phone: '',
      email: '',
      website: '',
      is_active: true,
    },
  })

  useEffect(() => {
    if (hospital) {
      reset({
        name: hospital.name,
        registration_number: hospital.registration_number,
        address: hospital.address,
        city: hospital.city,
        state: hospital.state,
        postal_code: hospital.postal_code,
        phone: hospital.phone,
        email: hospital.email,
        website: hospital.website || '',
        is_active: hospital.is_active,
      })
    }
  }, [hospital, reset])

  const updateMutation = useMutation({
    mutationFn: (data: Partial<HospitalInput>) => hospitalApi.updateHospital(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospitals', id] })
      queryClient.invalidateQueries({ queryKey: ['hospitals'] })
      navigate(`/hospitals/${id}`)
    },
  })

  const onSubmit = (formData: HospitalFormData) => {
    updateMutation.mutate({
      ...formData,
      website: formData.website || '',
    })
  }

  if (isLoadingHospital) {
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
        title={`Edit ${hospital?.name || 'Hospital'}`}
        subtitle="Update hospital licensing, contact, and address information"
        backTo={`/hospitals/${id}`}
        backLabel="Back to Hospital Details"
      />

      {updateMutation.isError && (
        <div className="p-4 mb-5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to update hospital: {updateMutation.error.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <FormSection
          title="Facility Identification"
          description="Legal name and government health registration ID"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="hospital-name-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Hospital Name *
              </label>
              <input
                id="hospital-name-edit"
                type="text"
                {...register('name')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.name && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="hospital-reg-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Registration / License Number *
              </label>
              <input
                id="hospital-reg-edit"
                type="text"
                {...register('registration_number')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
              {errors.registration_number && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.registration_number.message}</p>
              )}
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Contact & Web Presence"
          description="Public reception phone number, official email and website"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="hospital-phone-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number *
              </label>
              <input
                id="hospital-phone-edit"
                type="tel"
                {...register('phone')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.phone && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="hospital-email-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address *
              </label>
              <input
                id="hospital-email-edit"
                type="email"
                {...register('email')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.email && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="hospital-website-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Website URL
              </label>
              <input
                id="hospital-website-edit"
                type="url"
                {...register('website')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.website && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.website.message}</p>
              )}
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Physical Location & Address"
          description="Complete geographical address"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="hospital-address-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                Street Address *
              </label>
              <textarea
                id="hospital-address-edit"
                rows={2}
                {...register('address')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.address && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.address.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="hospital-city-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                  City *
                </label>
                <input
                  id="hospital-city-edit"
                  type="text"
                  {...register('city')}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {errors.city && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.city.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="hospital-state-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                  State *
                </label>
                <input
                  id="hospital-state-edit"
                  type="text"
                  {...register('state')}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {errors.state && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.state.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="hospital-postal-edit" className="block text-xs font-semibold text-slate-700 mb-1">
                  Postal Code *
                </label>
                <input
                  id="hospital-postal-edit"
                  type="text"
                  {...register('postal_code')}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {errors.postal_code && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.postal_code.message}</p>
                )}
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Facility Operational Status"
          description="Control whether this hospital accepts appointments and admissions"
        >
          <div className="flex items-center gap-3">
            <input
              id="is_active"
              type="checkbox"
              {...register('is_active')}
              className="h-4 w-4 rounded-xs border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="is_active" className="text-xs font-semibold text-slate-800 cursor-pointer">
              Facility is active and operational
            </label>
          </div>
        </FormSection>

        <div className="flex items-center justify-end gap-3 pt-2 mb-10">
          <button
            type="button"
            onClick={() => navigate(`/hospitals/${id}`)}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || updateMutation.isPending}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving Changes...' : 'Save Hospital Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default HospitalEditPage
