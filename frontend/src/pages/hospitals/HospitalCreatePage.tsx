import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
  website: z.string().url('Must be a valid URL (e.g. https://metrocare.org)').or(z.literal('')).optional(),
  is_active: z.boolean(),
})

type HospitalFormData = z.infer<typeof hospitalSchema>

export const HospitalCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
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

  const createMutation = useMutation({
    mutationFn: (data: HospitalInput) => hospitalApi.createHospital(data),
    onSuccess: (newHospital) => {
      queryClient.invalidateQueries({ queryKey: ['hospitals'] })
      navigate(`/hospitals/${newHospital.id}`)
    },
  })

  const onSubmit = (formData: HospitalFormData) => {
    createMutation.mutate({
      ...formData,
      website: formData.website || '',
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Register New Hospital"
        subtitle="Create an organizational healthcare facility record"
        backTo="/hospitals"
        backLabel="Back to Hospitals"
      />

      {createMutation.isError && (
        <div className="p-4 mb-5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to register hospital: {createMutation.error.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <FormSection
          title="Facility Identification"
          description="Legal name and government health registration ID"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="hospital-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Hospital Name *
              </label>
              <input
                id="hospital-name"
                type="text"
                {...register('name')}
                placeholder="e.g. MetroCare Memorial Hospital"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.name && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="hospital-reg" className="block text-xs font-semibold text-slate-700 mb-1">
                Registration / License Number *
              </label>
              <input
                id="hospital-reg"
                type="text"
                {...register('registration_number')}
                placeholder="e.g. HOSP-2026-DL-091"
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
              <label htmlFor="hospital-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number *
              </label>
              <input
                id="hospital-phone"
                type="tel"
                {...register('phone')}
                placeholder="+91 11 2345 6789"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.phone && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="hospital-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address *
              </label>
              <input
                id="hospital-email"
                type="email"
                {...register('email')}
                placeholder="info@metrocare.org"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.email && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="hospital-website" className="block text-xs font-semibold text-slate-700 mb-1">
                Website URL
              </label>
              <input
                id="hospital-website"
                type="url"
                {...register('website')}
                placeholder="https://metrocare.org"
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
          description="Complete geographical address and dispatch location"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="hospital-address" className="block text-xs font-semibold text-slate-700 mb-1">
                Street Address *
              </label>
              <textarea
                id="hospital-address"
                rows={2}
                {...register('address')}
                placeholder="42 Health City Avenue, Sector 18"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.address && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.address.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="hospital-city" className="block text-xs font-semibold text-slate-700 mb-1">
                  City *
                </label>
                <input
                  id="hospital-city"
                  type="text"
                  {...register('city')}
                  placeholder="New Delhi"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {errors.city && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.city.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="hospital-state" className="block text-xs font-semibold text-slate-700 mb-1">
                  State / Province *
                </label>
                <input
                  id="hospital-state"
                  type="text"
                  {...register('state')}
                  placeholder="Delhi"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {errors.state && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.state.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="hospital-postal" className="block text-xs font-semibold text-slate-700 mb-1">
                  Postal Code *
                </label>
                <input
                  id="hospital-postal"
                  type="text"
                  {...register('postal_code')}
                  placeholder="110001"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {errors.postal_code && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.postal_code.message}</p>
                )}
              </div>
            </div>
          </div>
        </FormSection>

        <div className="flex items-center justify-end gap-3 pt-2 mb-10">
          <button
            type="button"
            onClick={() => navigate('/hospitals')}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {createMutation.isPending ? 'Registering...' : 'Save & Register Hospital'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default HospitalCreatePage
