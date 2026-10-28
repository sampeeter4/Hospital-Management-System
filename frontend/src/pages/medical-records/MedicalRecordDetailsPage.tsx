import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  HeartPulse,
  Activity,
  User,
  Plus,
  Lock,
} from 'lucide-react'
import { medicalRecordApi } from '../../services/api/medicalRecordApi'
import {
  ClinicalEncounter,
  VitalSigns,
  EncounterDiagnosis,
  ClinicalNote,
} from '../../types/medicalRecords'
import { PageHeader, ConfirmDialog } from '../../components/ui'

export const MedicalRecordDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Modal states for adding vitals, notes, diagnoses
  const [isCloseEncounterOpen, setIsCloseEncounterOpen] = useState(false)
  const [isAddVitalsOpen, setIsAddVitalsOpen] = useState(false)
  const [isAddDiagnosisOpen, setIsAddDiagnosisOpen] = useState(false)
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false)

  // Vitals form state
  const [vitalsForm, setVitalsForm] = useState<Partial<VitalSigns>>({
    systolic_bp: 120,
    diastolic_bp: 80,
    heart_rate: 72,
    temperature: 36.6,
    temperature_unit: 'C',
    respiratory_rate: 16,
    oxygen_saturation: 98,
    height: 175,
    height_unit: 'cm',
    weight: 70,
    weight_unit: 'kg',
  })

  // Diagnosis form state
  const [diagForm, setDiagForm] = useState<Partial<EncounterDiagnosis>>({
    diagnosis_description: '',
    diagnosis_code: '',
    code_system: 'ICD-10',
    is_primary: false,
    diagnosis_type: 'CONFIRMED',
    clinical_status: 'ACTIVE',
  })

  // SOAP Note form state
  const [noteForm, setNoteForm] = useState<Partial<ClinicalNote>>({
    note_type: 'SOAP',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    status: 'SIGNED',
  })

  // Fetch Encounter
  const { data: encounter, isLoading, isError, error } = useQuery<ClinicalEncounter, Error>({
    queryKey: ['encounter', id],
    queryFn: () => medicalRecordApi.getEncounter(id!),
    enabled: !!id,
  })

  // Close Encounter mutation
  const closeMutation = useMutation({
    mutationFn: () => medicalRecordApi.closeEncounter(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounter', id] })
      setIsCloseEncounterOpen(false)
    },
  })

  // Add Vitals mutation
  const addVitalsMutation = useMutation({
    mutationFn: (data: Partial<VitalSigns>) =>
      medicalRecordApi.createVitalSigns({ ...data, encounter: Number(id) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounter', id] })
      setIsAddVitalsOpen(false)
    },
  })

  // Add Diagnosis mutation
  const addDiagMutation = useMutation({
    mutationFn: (data: Partial<EncounterDiagnosis>) =>
      medicalRecordApi.createDiagnosis({ ...data, encounter: Number(id) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounter', id] })
      setIsAddDiagnosisOpen(false)
      setDiagForm({
        diagnosis_description: '',
        diagnosis_code: '',
        code_system: 'ICD-10',
        is_primary: false,
        diagnosis_type: 'CONFIRMED',
        clinical_status: 'ACTIVE',
      })
    },
  })

  // Add Clinical Note mutation
  const addNoteMutation = useMutation({
    mutationFn: (data: Partial<ClinicalNote>) =>
      medicalRecordApi.createClinicalNote({ ...data, encounter: Number(id) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounter', id] })
      setIsAddNoteOpen(false)
    },
  })

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-4 animate-pulse p-4">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-32 bg-slate-100 rounded-lg" />
        <div className="h-64 bg-slate-100 rounded-lg" />
      </div>
    )
  }

  if (isError || !encounter) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to load encounter: {error?.message || 'Encounter not found'}
        </div>
        <button
          onClick={() => navigate('/medical-records')}
          className="mt-4 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
        >
          Back to Medical Records
        </button>
      </div>
    )
  }

  const isOpen = encounter.status === 'OPEN'

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title={`Clinical Encounter ${encounter.encounter_reference}`}
        subtitle={`Recorded on ${encounter.encounter_date} by Dr. ${encounter.doctor_name || encounter.doctor}`}
        backTo="/medical-records"
        backLabel="Back to Medical Records"
        actions={
          <div className="flex items-center gap-2">
            {isOpen && (
              <>
                <button
                  onClick={() => setIsAddVitalsOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                >
                  <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                  Record Vitals
                </button>
                <button
                  onClick={() => setIsAddDiagnosisOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                  Add Diagnosis
                </button>
                <button
                  onClick={() => setIsAddNoteOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add SOAP Note
                </button>
                <button
                  onClick={() => setIsCloseEncounterOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-2xs cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Finalize & Close Encounter
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Main Encounter Information Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-slate-900">
                {encounter.encounter_reference}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border ${
                  isOpen
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {isOpen ? 'Active / Open Encounter' : 'Closed & Signed Encounter'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                {encounter.encounter_type.toLowerCase().replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
              <span>Date: <strong className="font-mono text-slate-800">{encounter.encounter_date}</strong></span>
              <span>•</span>
              <span>Physician: <strong>Dr. {encounter.doctor_name || encounter.doctor}</strong></span>
              <span>•</span>
              <span>Facility: <strong>{encounter.hospital_name}</strong> ({encounter.department_name})</span>
            </div>
          </div>

          <div className="text-right">
            <button
              onClick={() => navigate(`/patients/${encounter.patient}`)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              Open Patient EHR File ({encounter.patient_name || `ID #${encounter.patient}`}) →
            </button>
          </div>
        </div>
      </div>

      {/* Chief Complaint & HPI */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
          Chief Complaint & History of Present Illness (HPI)
        </h3>
        <div className="space-y-3">
          <div>
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Chief Complaint
            </span>
            <p className="text-xs text-slate-800 mt-1 font-medium">{encounter.chief_complaint}</p>
          </div>
          {encounter.history_of_present_illness && (
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                History of Present Illness
              </span>
              <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap leading-relaxed">
                {encounter.history_of_present_illness}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Vital Signs Panel */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <HeartPulse className="w-4 h-4 text-rose-500" />
            Physiological Vital Signs
          </h3>
          {isOpen && (
            <button
              onClick={() => setIsAddVitalsOpen(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              + Record Measurement
            </button>
          )}
        </div>

        {!encounter.vital_signs || encounter.vital_signs.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">No vital signs measured for this encounter yet.</p>
        ) : (
          <div className="space-y-4">
            {encounter.vital_signs.map((v, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-slate-50/75 border border-slate-200">
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs">
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400">
                      Blood Pressure
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-800">
                      {v.systolic_bp && v.diastolic_bp ? `${v.systolic_bp}/${v.diastolic_bp}` : '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">mmHg</span>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400">
                      Heart Rate
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-800">
                      {v.heart_rate ?? '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">bpm</span>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400">
                      Temperature
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-800">
                      {v.temperature ?? '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">°{v.temperature_unit || 'C'}</span>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400">
                      SpO2 (Oxygen)
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-800">
                      {v.oxygen_saturation ?? '—'}%
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400">
                      Resp Rate
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-800">
                      {v.respiratory_rate ?? '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">/min</span>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400">
                      Calculated BMI
                    </span>
                    <span className="font-mono text-sm font-bold text-blue-700">
                      {v.bmi ?? '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">kg/m²</span>
                  </div>
                </div>
                {v.notes && <p className="text-[11px] text-slate-500 mt-2">Notes: {v.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Diagnoses Panel */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-blue-600" />
            Clinical Diagnoses (ICD-10)
          </h3>
          {isOpen && (
            <button
              onClick={() => setIsAddDiagnosisOpen(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              + Add Diagnosis
            </button>
          )}
        </div>

        {!encounter.diagnoses || encounter.diagnoses.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">No diagnoses recorded for this encounter.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {encounter.diagnoses.map((diag, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      {diag.diagnosis_description}
                    </span>
                    {diag.diagnosis_code && (
                      <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {diag.code_system || 'ICD-10'}: {diag.diagnosis_code}
                      </span>
                    )}
                    {diag.is_primary && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 capitalize">
                    Type: {diag.diagnosis_type?.toLowerCase()} • Status: {diag.clinical_status?.toLowerCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SOAP Clinical Notes */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Clinical Documentation & SOAP Progress Notes
          </h3>
          {isOpen && (
            <button
              onClick={() => setIsAddNoteOpen(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              + Add SOAP Note
            </button>
          )}
        </div>

        {!encounter.clinical_notes || encounter.clinical_notes.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">No SOAP clinical notes added to this encounter.</p>
        ) : (
          <div className="space-y-4">
            {encounter.clinical_notes.map((note, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">
                    {note.note_type} Note
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {note.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {note.subjective && (
                    <div className="p-3 rounded bg-slate-50 border border-slate-100">
                      <strong className="block text-slate-700 font-semibold mb-1">Subjective (S):</strong>
                      <p className="text-slate-600 whitespace-pre-wrap">{note.subjective}</p>
                    </div>
                  )}
                  {note.objective && (
                    <div className="p-3 rounded bg-slate-50 border border-slate-100">
                      <strong className="block text-slate-700 font-semibold mb-1">Objective (O):</strong>
                      <p className="text-slate-600 whitespace-pre-wrap">{note.objective}</p>
                    </div>
                  )}
                  {note.assessment && (
                    <div className="p-3 rounded bg-slate-50 border border-slate-100">
                      <strong className="block text-slate-700 font-semibold mb-1">Assessment (A):</strong>
                      <p className="text-slate-600 whitespace-pre-wrap">{note.assessment}</p>
                    </div>
                  )}
                  {note.plan && (
                    <div className="p-3 rounded bg-slate-50 border border-slate-100">
                      <strong className="block text-slate-700 font-semibold mb-1">Plan (P):</strong>
                      <p className="text-slate-600 whitespace-pre-wrap">{note.plan}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Close Encounter Confirmation Modal */}
      {isCloseEncounterOpen && (
        <ConfirmDialog
          isOpen={true}
          title="Finalize & Close Clinical Encounter"
          description="Closing this encounter will archive it and lock modifications. Are you sure all diagnoses and clinical notes are complete?"
          confirmLabel={closeMutation.isPending ? 'Closing...' : 'Confirm & Close'}
          cancelLabel="Continue Editing"
          variant="primary"
          onCancel={() => setIsCloseEncounterOpen(false)}
          onConfirm={() => closeMutation.mutate()}
        />
      )}

      {/* Add Vitals Dialog */}
      {isAddVitalsOpen && (
        <ConfirmDialog
          isOpen={true}
          title="Record Vital Signs Measurement"
          confirmLabel={addVitalsMutation.isPending ? 'Saving...' : 'Save Vitals'}
          cancelLabel="Cancel"
          variant="primary"
          onCancel={() => setIsAddVitalsOpen(false)}
          onConfirm={() => addVitalsMutation.mutate(vitalsForm)}
        >
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <label htmlFor="bp-sys" className="block text-[11px] font-semibold text-slate-700 mb-1">
                Systolic BP (mmHg)
              </label>
              <input
                id="bp-sys"
                type="number"
                value={vitalsForm.systolic_bp ?? ''}
                onChange={(e) => setVitalsForm({ ...vitalsForm, systolic_bp: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded font-mono"
              />
            </div>
            <div>
              <label htmlFor="bp-dia" className="block text-[11px] font-semibold text-slate-700 mb-1">
                Diastolic BP (mmHg)
              </label>
              <input
                id="bp-dia"
                type="number"
                value={vitalsForm.diastolic_bp ?? ''}
                onChange={(e) => setVitalsForm({ ...vitalsForm, diastolic_bp: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded font-mono"
              />
            </div>
            <div>
              <label htmlFor="hr" className="block text-[11px] font-semibold text-slate-700 mb-1">
                Heart Rate (bpm)
              </label>
              <input
                id="hr"
                type="number"
                value={vitalsForm.heart_rate ?? ''}
                onChange={(e) => setVitalsForm({ ...vitalsForm, heart_rate: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded font-mono"
              />
            </div>
            <div>
              <label htmlFor="temp" className="block text-[11px] font-semibold text-slate-700 mb-1">
                Temperature (°C)
              </label>
              <input
                id="temp"
                type="number"
                step="0.1"
                value={vitalsForm.temperature ?? ''}
                onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded font-mono"
              />
            </div>
            <div>
              <label htmlFor="spo2" className="block text-[11px] font-semibold text-slate-700 mb-1">
                Oxygen SpO2 (%)
              </label>
              <input
                id="spo2"
                type="number"
                value={vitalsForm.oxygen_saturation ?? ''}
                onChange={(e) => setVitalsForm({ ...vitalsForm, oxygen_saturation: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded font-mono"
              />
            </div>
            <div>
              <label htmlFor="weight" className="block text-[11px] font-semibold text-slate-700 mb-1">
                Weight (kg)
              </label>
              <input
                id="weight"
                type="number"
                step="0.1"
                value={vitalsForm.weight ?? ''}
                onChange={(e) => setVitalsForm({ ...vitalsForm, weight: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded font-mono"
              />
            </div>
          </div>
        </ConfirmDialog>
      )}

      {/* Add Diagnosis Dialog */}
      {isAddDiagnosisOpen && (
        <ConfirmDialog
          isOpen={true}
          title="Add Clinical Diagnosis"
          confirmLabel={addDiagMutation.isPending ? 'Saving...' : 'Add Diagnosis'}
          cancelLabel="Cancel"
          variant="primary"
          onCancel={() => setIsAddDiagnosisOpen(false)}
          onConfirm={() => {
            if (diagForm.diagnosis_description?.trim()) {
              addDiagMutation.mutate(diagForm)
            }
          }}
        >
          <div className="mt-3 space-y-3 text-xs">
            <div>
              <label htmlFor="diag-desc" className="block text-[11px] font-semibold text-slate-700 mb-1">
                Diagnosis Description *
              </label>
              <input
                id="diag-desc"
                type="text"
                placeholder="e.g. Essential (primary) hypertension"
                value={diagForm.diagnosis_description || ''}
                onChange={(e) => setDiagForm({ ...diagForm, diagnosis_description: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="diag-code" className="block text-[11px] font-semibold text-slate-700 mb-1">
                  ICD-10 Code
                </label>
                <input
                  id="diag-code"
                  type="text"
                  placeholder="e.g. I10"
                  value={diagForm.diagnosis_code || ''}
                  onChange={(e) => setDiagForm({ ...diagForm, diagnosis_code: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded font-mono"
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  id="diag-primary"
                  type="checkbox"
                  checked={diagForm.is_primary}
                  onChange={(e) => setDiagForm({ ...diagForm, is_primary: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="diag-primary" className="text-xs font-semibold text-slate-700">
                  Primary Diagnosis
                </label>
              </div>
            </div>
          </div>
        </ConfirmDialog>
      )}

      {/* Add SOAP Note Dialog */}
      {isAddNoteOpen && (
        <ConfirmDialog
          isOpen={true}
          title="Add SOAP Clinical Progress Note"
          confirmLabel={addNoteMutation.isPending ? 'Saving...' : 'Save SOAP Note'}
          cancelLabel="Cancel"
          variant="primary"
          onCancel={() => setIsAddNoteOpen(false)}
          onConfirm={() => addNoteMutation.mutate(noteForm)}
        >
          <div className="mt-3 space-y-2 text-xs">
            <div>
              <label htmlFor="soap-s" className="block text-[10px] font-bold text-slate-700 uppercase">
                Subjective (Patient Narrative)
              </label>
              <textarea
                id="soap-s"
                rows={2}
                value={noteForm.subjective || ''}
                onChange={(e) => setNoteForm({ ...noteForm, subjective: e.target.value })}
                className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
              />
            </div>
            <div>
              <label htmlFor="soap-o" className="block text-[10px] font-bold text-slate-700 uppercase">
                Objective (Observations & Lab Findings)
              </label>
              <textarea
                id="soap-o"
                rows={2}
                value={noteForm.objective || ''}
                onChange={(e) => setNoteForm({ ...noteForm, objective: e.target.value })}
                className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
              />
            </div>
            <div>
              <label htmlFor="soap-a" className="block text-[10px] font-bold text-slate-700 uppercase">
                Assessment (Clinical Impression)
              </label>
              <textarea
                id="soap-a"
                rows={2}
                value={noteForm.assessment || ''}
                onChange={(e) => setNoteForm({ ...noteForm, assessment: e.target.value })}
                className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
              />
            </div>
            <div>
              <label htmlFor="soap-p" className="block text-[10px] font-bold text-slate-700 uppercase">
                Plan (Treatment & Follow-up Instructions)
              </label>
              <textarea
                id="soap-p"
                rows={2}
                value={noteForm.plan || ''}
                onChange={(e) => setNoteForm({ ...noteForm, plan: e.target.value })}
                className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
              />
            </div>
          </div>
        </ConfirmDialog>
      )}
    </div>
  )
}

export default MedicalRecordDetailsPage
