import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { laboratoryApi } from '../../services/api/laboratoryApi'
import { LabTest, LabTestParameter } from '../../types/laboratory'
import { PageHeader, FormSection } from '../../components/ui'

export const LabResultEntryPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const orderItemId = Number(searchParams.get('orderItemId'))
  const testName = searchParams.get('testName') || 'Diagnostic Test'

  // Parameter entry state: parameter_id -> { numeric_value, text_value }
  const [paramValues, setParamValues] = useState<Record<number, { numeric_value?: string; text_value?: string }>>({})
  const [overallInterpretation, setOverallInterpretation] = useState('')
  const [clinicalComments, setClinicalComments] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  // Fetch all tests to locate parameters for this test name
  const { data: testsData, isLoading: isLoadingTests } = useQuery({
    queryKey: ['lab-tests-for-entry'],
    queryFn: () => laboratoryApi.getLabTests({ page_size: 100 }),
  })

  // Match test by testName
  const matchingTest: LabTest | undefined = testsData?.results?.find(
    (t: LabTest) => t.name.toLowerCase() === testName.toLowerCase() || testName.includes(t.name)
  )

  const parameters: LabTestParameter[] = matchingTest?.parameters || []

  const handleNumericChange = (paramId: number, val: string) => {
    setParamValues((prev) => ({
      ...prev,
      [paramId]: {
        ...prev[paramId],
        numeric_value: val,
      },
    }))
  }

  const handleTextChange = (paramId: number, val: string) => {
    setParamValues((prev) => ({
      ...prev,
      [paramId]: {
        ...prev[paramId],
        text_value: val,
      },
    }))
  }

  const enterMutation = useMutation({
    mutationFn: (data: {
      order_item_id: number
      overall_interpretation?: string
      clinical_comments?: string
      parameter_values: { parameter_id: number; numeric_value?: number | null; text_value?: string }[]
    }) => laboratoryApi.enterLabResult(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-order'] })
      queryClient.invalidateQueries({ queryKey: ['lab-results'] })
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] })
      navigate(-1)
    },
    onError: (err: unknown) => {
      if (isAxiosError(err)) {
        setFormError(err.response?.data?.detail || err.message)
      } else if (err instanceof Error) {
        setFormError(err.message)
      } else {
        setFormError('Failed to submit diagnostic results.')
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderItemId) {
      setFormError('Missing valid laboratory order item ID.')
      return
    }

    if (parameters.length > 0) {
      const formattedParams = parameters.map((p) => {
        const val = paramValues[p.id]
        return {
          parameter_id: p.id,
          numeric_value: val?.numeric_value ? parseFloat(val.numeric_value) : null,
          text_value: val?.text_value || '',
        }
      })

      enterMutation.mutate({
        order_item_id: orderItemId,
        overall_interpretation: overallInterpretation,
        clinical_comments: clinicalComments,
        parameter_values: formattedParams,
      })
    } else {
      // Fallback if parameters are not defined in catalogue
      enterMutation.mutate({
        order_item_id: orderItemId,
        overall_interpretation: overallInterpretation,
        clinical_comments: clinicalComments,
        parameter_values: [],
      })
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title={`Enter Diagnostic Results: ${testName}`}
        subtitle={`Lab Workstation — Recording verified analyte values for Order Item #${orderItemId}`}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Cancel & Back
        </button>
      </PageHeader>

      {formError && (
        <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection
          title="Analyte Measurements & Parameters"
          description="Enter measured values against reference intervals"
        >
          {isLoadingTests ? (
            <div className="p-6 text-center text-xs text-slate-500">Loading test parameters...</div>
          ) : parameters.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
              No specific parameter breakdown registered for this test. You can enter an overall diagnostic interpretation below.
            </div>
          ) : (
            <div className="space-y-4">
              {parameters.map((param) => {
                const isNumeric = param.data_type === 'NUMERIC'
                const refRange = param.reference_ranges?.[0]
                const refDisplay = refRange
                  ? `${refRange.min_normal_value ?? ''} - ${refRange.max_normal_value ?? ''} ${param.unit || ''}`
                  : null

                return (
                  <div
                    key={param.id}
                    className="p-3.5 bg-slate-50/60 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                  >
                    <div className="sm:col-span-4">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-200 px-1 rounded">
                          {param.code}
                        </span>
                        <h5 className="text-xs font-semibold text-slate-800">{param.name}</h5>
                      </div>
                      {refDisplay && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Ref: <span className="font-mono font-medium text-slate-700">{refDisplay}</span>
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-5">
                      {isNumeric ? (
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            value={paramValues[param.id]?.numeric_value || ''}
                            onChange={(e) => handleNumericChange(param.id, e.target.value)}
                            placeholder="Measured value..."
                            className="w-full px-3 py-1.5 text-xs font-mono font-medium border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                          />
                          {param.unit && (
                            <span className="absolute right-3 top-1.5 text-xs text-slate-400 font-mono">
                              {param.unit}
                            </span>
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={paramValues[param.id]?.text_value || ''}
                          onChange={(e) => handleTextChange(param.id, e.target.value)}
                          placeholder="Observed qualitative result..."
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        />
                      )}
                    </div>

                    <div className="sm:col-span-3 text-right">
                      <span className="text-[11px] text-slate-400 uppercase tracking-wide">
                        {param.data_type}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </FormSection>

        <FormSection
          title="Clinical Diagnostic Interpretation"
          description="Overall synthesis, microscopy observations, and lab technician remarks"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="interpretation" className="block text-xs font-semibold text-slate-700 mb-1">
                Overall Diagnostic Interpretation
              </label>
              <textarea
                id="interpretation"
                rows={3}
                value={overallInterpretation}
                onChange={(e) => setOverallInterpretation(e.target.value)}
                placeholder="Diagnostic summary, e.g. Normocytic normochromic blood picture. No atypical cells seen."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="comments" className="block text-xs font-semibold text-slate-700 mb-1">
                Laboratory Comments / Bench Notes
              </label>
              <textarea
                id="comments"
                rows={2}
                value={clinicalComments}
                onChange={(e) => setClinicalComments(e.target.value)}
                placeholder="Specimen quality notes, repeat testing confirmation, analyzer flags..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </FormSection>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={enterMutation.isPending}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors"
          >
            {enterMutation.isPending ? 'Submitting Result...' : 'Save & Record Lab Result'}
          </button>
        </div>
      </form>
    </div>
  )
}
export default LabResultEntryPage
