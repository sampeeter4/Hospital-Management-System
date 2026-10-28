import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { billingApi } from '../../services/api/billingApi'
import { patientApi } from '../../services/api/patientApi'
import { hospitalApi } from '../../services/api/hospitalApi'
import { InvoiceInput, ServiceItem } from '../../types/billing'
import { Hospital } from '../../types/hospitals'
import { Patient } from '../../types/patients'
import { PageHeader, FormSection } from '../../components/ui'

const lineItemSchema = z.object({
  service_code: z.string().min(1, 'Service code required'),
  description: z.string().min(1, 'Description required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(0, 'Unit price cannot be negative'),
  discount: z.number().min(0),
  tax_rate: z.number().min(0),
})

const invoiceSchema = z.object({
  patient: z.number().min(1, 'Please select a patient file'),
  hospital: z.number().min(1, 'Please select a hospital facility'),
  due_date: z.string().min(1, 'Payment due date is required'),
  currency: z.string(),
  notes: z.string().optional(),
  line_items_input: z.array(lineItemSchema).min(1, 'Add at least one item to bill'),
})

type InvoiceFormData = z.infer<typeof invoiceSchema>

const getDefaultDueDate = () => {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toISOString().split('T')[0]
}

export const InvoiceCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const preselectedPatient = searchParams.get('patient')

  // Fetch Patients
  const { data: patientsData } = useQuery({
    queryKey: ['patients-picker'],
    queryFn: () => patientApi.getPatients({ page_size: 100 }),
  })
  const patients: Patient[] = patientsData?.results || []

  // Fetch Hospitals
  const { data: hospitals = [] } = useQuery<Hospital[], Error>({
    queryKey: ['hospitals'],
    queryFn: () => hospitalApi.getHospitals(),
  })

  // Fetch Service Catalogue
  const { data: servicesData } = useQuery({
    queryKey: ['service-items-catalogue'],
    queryFn: () => billingApi.getServiceItems({ is_active: true, page_size: 100 }),
  })
  const services: ServiceItem[] = servicesData?.results || []

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      patient: preselectedPatient ? Number(preselectedPatient) : undefined,
      hospital: undefined,
      due_date: getDefaultDueDate(),
      currency: 'USD',
      notes: 'Payment terms: Due within 14 calendar days of invoice date.',
      line_items_input: [
        {
          service_code: 'CONS-001',
          description: 'Specialist Physician Clinical Consultation',
          quantity: 1,
          unit_price: 150.0,
          discount: 0,
          tax_rate: 0,
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'line_items_input',
  })

  const watchedItems = useWatch({ control, name: 'line_items_input' }) || []

  // Live calculation of financial totals
  const subtotal = watchedItems.reduce(
    (acc, itm) => acc + (Number(itm.quantity) || 0) * (Number(itm.unit_price) || 0),
    0
  )
  const totalDiscount = watchedItems.reduce((acc, itm) => acc + (Number(itm.discount) || 0), 0)
  const totalTax = watchedItems.reduce((acc, itm) => {
    const itemSub = (Number(itm.quantity) || 0) * (Number(itm.unit_price) || 0) - (Number(itm.discount) || 0)
    return acc + (itemSub * (Number(itm.tax_rate) || 0)) / 100
  }, 0)
  const grandTotal = Math.max(0, subtotal - totalDiscount + totalTax)

  const handleSelectService = (index: number, serviceId: number) => {
    const srv = services.find((s) => s.id === serviceId)
    if (srv) {
      setValue(`line_items_input.${index}.service_code`, srv.code)
      setValue(`line_items_input.${index}.description`, srv.name)
      setValue(`line_items_input.${index}.unit_price`, Number(srv.unit_price))
      setValue(`line_items_input.${index}.tax_rate`, Number(srv.tax_rate || 0))
    }
  }

  const createMutation = useMutation({
    mutationFn: (data: InvoiceInput) => billingApi.createInvoice(data),
    onSuccess: (newInvoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices-list'] })
      queryClient.invalidateQueries({ queryKey: ['billing-summary-kpis'] })
      navigate(`/billing/invoices/${newInvoice.id}`)
    },
  })

  const onSubmit = (formData: InvoiceFormData) => {
    createMutation.mutate({
      patient: Number(formData.patient),
      hospital: Number(formData.hospital),
      due_date: formData.due_date,
      currency: formData.currency,
      notes: formData.notes,
      line_items_input: formData.line_items_input.map((itm) => ({
        ...itm,
        quantity: Number(itm.quantity),
        unit_price: Number(itm.unit_price),
        discount: Number(itm.discount || 0),
        tax_rate: Number(itm.tax_rate || 0),
      })),
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Generate Patient Invoice"
        subtitle="Formulate itemized patient billing, tariffs, line item charges, and payment due terms"
        backTo="/billing/invoices"
        backLabel="Back to Invoices"
      />

      {createMutation.isError && (
        <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to generate invoice: {createMutation.error.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection
          title="Patient & Facility Billing Details"
          description="Identify recipient patient account and billing facility"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="inv-patient" className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Account *
              </label>
              <select
                id="inv-patient"
                {...register('patient', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Patient...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.patient_name || p.username} ({p.mrn})
                  </option>
                ))}
              </select>
              {errors.patient && (
                <p className="mt-1 text-xs text-rose-500">{errors.patient.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="inv-hospital" className="block text-xs font-semibold text-slate-700 mb-1">
                Billing Hospital Facility *
              </label>
              <select
                id="inv-hospital"
                {...register('hospital', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Facility...</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
              {errors.hospital && (
                <p className="mt-1 text-xs text-rose-500">{errors.hospital.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="inv-due" className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Due Date *
              </label>
              <input
                id="inv-due"
                type="date"
                {...register('due_date')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
              {errors.due_date && (
                <p className="mt-1 text-xs text-rose-500">{errors.due_date.message}</p>
              )}
            </div>
          </div>
        </FormSection>

        {/* Itemized Line Items Builder */}
        <FormSection
          title="Itemized Billing Line Items"
          description="Add clinical services, diagnostic procedures, consultations, or ward charges"
        >
          {errors.line_items_input && (
            <div className="p-3 mb-4 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {errors.line_items_input.message}
            </div>
          )}

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="p-4 bg-slate-50/70 rounded-lg border border-slate-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Line Item #{index + 1}
                  </span>

                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-xs text-rose-600 hover:text-rose-800 flex items-center"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Remove
                    </button>
                  )}
                </div>

                {/* Service Catalogue Preset dropdown */}
                {services.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Load Preset Tariff from Catalogue:
                    </label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleSelectService(index, Number(e.target.value))
                        }
                      }}
                      className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded bg-white text-slate-700"
                    >
                      <option value="">Select standard tariff preset...</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} — {s.name} (${Number(s.unit_price).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Code *
                    </label>
                    <input
                      type="text"
                      {...register(`line_items_input.${index}.service_code`)}
                      placeholder="e.g. LAB-001"
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Service Description *
                    </label>
                    <input
                      type="text"
                      {...register(`line_items_input.${index}.description`)}
                      placeholder="e.g. Comprehensive Metabolic Panel"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      step="any"
                      {...register(`line_items_input.${index}.quantity`, { valueAsNumber: true })}
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Unit Price ($) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      {...register(`line_items_input.${index}.unit_price`, { valueAsNumber: true })}
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                      Discount ($)
                    </label>
                    <input
                      type="number"
                      step="any"
                      {...register(`line_items_input.${index}.discount`, { valueAsNumber: true })}
                      placeholder="0.00"
                      className="w-full px-2.5 py-1 text-xs font-mono border border-slate-200 rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      step="any"
                      {...register(`line_items_input.${index}.tax_rate`, { valueAsNumber: true })}
                      placeholder="0"
                      className="w-full px-2.5 py-1 text-xs font-mono border border-slate-200 rounded bg-white"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                append({
                  service_code: '',
                  description: '',
                  quantity: 1,
                  unit_price: 50.0,
                  discount: 0,
                  tax_rate: 0,
                })
              }
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Another Service Item
            </button>
          </div>

          {/* Real-time Calculation Card */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200 flex justify-end">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono">${subtotal.toFixed(2)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discounts:</span>
                  <span className="font-mono">-${totalDiscount.toFixed(2)}</span>
                </div>
              )}
              {totalTax > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Taxes:</span>
                  <span className="font-mono">+${totalTax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t border-slate-300">
                <span>Invoice Total:</span>
                <span className="font-mono text-blue-700">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </FormSection>

        {/* Billing Notes & Instructions */}
        <FormSection
          title="Payment Terms & Patient Instructions"
          description="Additional notes printed on the bottom of the invoice document"
        >
          <div>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </FormSection>

        {/* Submit */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => navigate('/billing/invoices')}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors"
          >
            {createMutation.isPending ? 'Generating Invoice...' : 'Create Patient Invoice'}
          </button>
        </div>
      </form>
    </div>
  )
}
export default InvoiceCreatePage
