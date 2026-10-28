import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Check, Search } from 'lucide-react'
import { laboratoryApi } from '../../services/api/laboratoryApi'
import { patientApi } from '../../services/api/patientApi'
import { hospitalApi } from '../../services/api/hospitalApi'
import { LabOrderInput, LabOrderPriority, LabTest } from '../../types/laboratory'
import { Doctor } from '../../types/hospitals'
import { Patient } from '../../types/patients'
import { PageHeader, FormSection } from '../../components/ui'

const labOrderSchema = z.object({
  patient: z.number().min(1, 'Please select a patient file'),
  ordering_doctor: z.number().min(1, 'Please select the ordering physician'),
  priority: z.enum(['ROUTINE', 'URGENT', 'STAT']),
  clinical_indication: z.string().min(3, 'Clinical indication / provisional diagnosis is required'),
  clinical_notes: z.string().optional(),
})

type LabOrderFormData = z.infer<typeof labOrderSchema>

export const LabOrderCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const preselectedPatient = searchParams.get('patient')
  const preselectedDoctor = searchParams.get('doctor')

  // Selected test IDs
  const [selectedTestIds, setSelectedTestIds] = useState<number[]>([])
  const [testSearch, setTestSearch] = useState('')
  const [testCategoryFilter, setTestCategoryFilter] = useState('')

  // Fetch Patients
  const { data: patientsData } = useQuery({
    queryKey: ['patients-picker'],
    queryFn: () => patientApi.getPatients({ page_size: 100 }),
  })
  const patients: Patient[] = patientsData?.results || []

  // Fetch Doctors
  const { data: doctors = [] } = useQuery<Doctor[], Error>({
    queryKey: ['doctors'],
    queryFn: () => hospitalApi.getDoctors(),
  })

  // Fetch Lab Tests Catalogue
  const { data: testsData, isLoading: isLoadingTests } = useQuery({
    queryKey: ['lab-tests-picker', { is_active: true }],
    queryFn: () => laboratoryApi.getLabTests({ is_active: true, page_size: 100 }),
  })
  const labTests: LabTest[] = testsData?.results || []

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LabOrderFormData>({
    resolver: zodResolver(labOrderSchema),
    defaultValues: {
      patient: preselectedPatient ? Number(preselectedPatient) : undefined,
      ordering_doctor: preselectedDoctor ? Number(preselectedDoctor) : undefined,
      priority: 'ROUTINE',
      clinical_indication: '',
      clinical_notes: '',
    },
  })

  const toggleTest = (id: number) => {
    setSelectedTestIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const createMutation = useMutation({
    mutationFn: (data: LabOrderInput) => laboratoryApi.createLabOrder(data),
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] })
      navigate(`/laboratory/orders/${newOrder.id}`)
    },
  })

  const [testError, setTestError] = useState<string | null>(null)

  const onSubmit = (formData: LabOrderFormData) => {
    if (selectedTestIds.length === 0) {
      setTestError('Please select at least one laboratory investigation to order.')
      return
    }
    setTestError(null)

    createMutation.mutate({
      patient: Number(formData.patient),
      ordering_doctor: Number(formData.ordering_doctor),
      priority: formData.priority as LabOrderPriority,
      clinical_indication: formData.clinical_indication,
      clinical_notes: formData.clinical_notes,
      test_ids: selectedTestIds,
    })
  }

  // Filter test catalog
  const filteredTests = labTests.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(testSearch.toLowerCase()) ||
      t.code.toLowerCase().includes(testSearch.toLowerCase())
    const matchesCategory = !testCategoryFilter || t.category === testCategoryFilter
    return matchesSearch && matchesCategory
  })

  // Unique categories
  const categories = Array.from(new Set(labTests.map((t) => t.category).filter(Boolean)))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Order Laboratory Investigations"
        subtitle="Formulate diagnostic test requisitions, specimen accessioning, and clinical indications"
        backTo="/laboratory"
        backLabel="Back to Orders"
      />

      {createMutation.isError && (
        <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to create laboratory requisition: {createMutation.error.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Patient & Doctor */}
        <FormSection
          title="Patient & Attending Physician"
          description="Designate the receiving patient file and authorizing physician"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="lab-patient" className="block text-xs font-semibold text-slate-700 mb-1">
                Patient File *
              </label>
              <select
                id="lab-patient"
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
              <label htmlFor="lab-doctor" className="block text-xs font-semibold text-slate-700 mb-1">
                Ordering Physician *
              </label>
              <select
                id="lab-doctor"
                {...register('ordering_doctor', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Doctor...</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.doctor_name || d.doctor_id} ({d.specialization})
                  </option>
                ))}
              </select>
              {errors.ordering_doctor && (
                <p className="mt-1 text-xs text-rose-500">{errors.ordering_doctor.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="lab-priority" className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Priority *
              </label>
              <select
                id="lab-priority"
                {...register('priority')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="ROUTINE">Routine (Standard Turnaround)</option>
                <option value="URGENT">Urgent (Expedited)</option>
                <option value="STAT">STAT (Immediate Clinical Need)</option>
              </select>
              {errors.priority && (
                <p className="mt-1 text-xs text-rose-500">{errors.priority.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 mt-4">
            <div>
              <label htmlFor="clinical-indication" className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Indication / Provisional Diagnosis *
              </label>
              <input
                id="clinical-indication"
                type="text"
                {...register('clinical_indication')}
                placeholder="e.g. Acute abdominal pain, Suspected bacterial sepsis, Type 2 Diabetes monitoring"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.clinical_indication && (
                <p className="mt-1 text-xs text-rose-500">{errors.clinical_indication.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="clinical-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Notes / Specimen Special Instructions
              </label>
              <textarea
                id="clinical-notes"
                {...register('clinical_notes')}
                rows={2}
                placeholder="Additional instructions for lab technician, fasting state, current medications..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </FormSection>

        {/* Diagnostic Tests Catalogue Picker */}
        <FormSection
          title="Diagnostic Tests Selection"
          description={`Select laboratory tests to include in this requisition (${selectedTestIds.length} selected)`}
        >
          {testError && (
            <div className="p-3 mb-4 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {testError}
            </div>
          )}

          {/* Test filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
                placeholder="Search diagnostic tests by name or code..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {categories.length > 0 && (
              <select
                value={testCategoryFilter}
                onChange={(e) => setTestCategoryFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-md px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tests Grid */}
          {isLoadingTests ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading diagnostic test catalogue...</div>
          ) : filteredTests.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-md">
              No matching diagnostic tests found.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1">
              {filteredTests.map((test) => {
                const isSelected = selectedTestIds.includes(test.id)
                return (
                  <div
                    key={test.id}
                    onClick={() => toggleTest(test.id)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-start justify-between ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[11px] font-bold text-slate-700 px-1.5 py-0.5 bg-white rounded border border-slate-200">
                          {test.code}
                        </span>
                        <h4 className="text-xs font-semibold text-slate-900">{test.name}</h4>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Matrix: <span className="text-slate-700 font-medium">{test.specimen_type}</span>
                        {test.turnaround_time_hours && ` • TAT: ~${test.turnaround_time_hours}h`}
                      </p>
                      {test.category_display && (
                        <span className="inline-block text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                          {test.category_display}
                        </span>
                      )}
                    </div>

                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ml-2 ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </FormSection>

        {/* Submit */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => navigate('/laboratory')}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors"
          >
            {createMutation.isPending ? 'Ordering Investigations...' : 'Place Laboratory Order'}
          </button>
        </div>
      </form>
    </div>
  )
}
export default LabOrderCreatePage
