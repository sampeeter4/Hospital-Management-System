import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Calendar,
  Edit2,
  Activity,
  Pill,
  FlaskConical,
  Bed,
  CreditCard,
  AlertTriangle,
  Phone,
  Mail,
  ShieldCheck,
  User,
  HeartPulse,
} from 'lucide-react'
import { patientApi } from '../../services/api/patientApi'
import { Patient } from '../../types/patients'
import { PageHeader, DetailField } from '../../components/ui'

interface AppointmentItem {
  id: number
  appointment_reference: string
  status: string
  doctor_name?: string
  doctor?: number | string
  department_name?: string
  department?: number | string
  appointment_date: string
  start_time: string
  appointment_type: string
}

interface TimelineItem {
  title?: string
  event_type?: string
  date?: string
  timestamp?: string
  description?: string
  notes?: string
}

interface PrescriptionItem {
  id: number
  prescription_number?: string
  doctor_name?: string
  doctor?: number | string
  created_at?: string
  status: string
}

interface LabResultItem {
  id: number
  test_name?: string
  result_value?: string
  units?: string
  reference_range?: string
  is_abnormal?: boolean
}

interface AdmissionItem {
  id: number
  admission_number?: string
  ward_name?: string
  ward?: number | string
  bed_number?: string
  bed?: number | string
  status: string
  admission_date: string
}

interface InvoiceItem {
  id: number
  invoice_number: string
  issue_date: string
  balance_due?: string
  total_amount: string
  status: string
}

type TabType =
  | 'overview'
  | 'appointments'
  | 'timeline'
  | 'prescriptions'
  | 'laboratory'
  | 'admissions'
  | 'billing'

function calculateAge(dobString: string): number | string {
  if (!dobString) return '—'
  const dob = new Date(dobString)
  const diffMs = Date.now() - dob.getTime()
  const ageDt = new Date(diffMs)
  return Math.abs(ageDt.getUTCFullYear() - 1970)
}

export const PatientDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  // Fetch Patient core details
  const { data: patient, isLoading, isError, error } = useQuery<Patient, Error>({
    queryKey: ['patient', id],
    queryFn: () => patientApi.getPatient(id!),
    enabled: !!id,
  })

  // Linked appointments
  const { data: appointments = [], isLoading: isLoadingApts } = useQuery({
    queryKey: ['patient-appointments', id],
    queryFn: () => patientApi.getPatientAppointments(id!),
    enabled: !!id && activeTab === 'appointments',
  })

  // Linked timeline
  const { data: timelineData, isLoading: isLoadingTimeline } = useQuery({
    queryKey: ['patient-timeline', id],
    queryFn: () => patientApi.getPatientTimeline(id!),
    enabled: !!id && activeTab === 'timeline',
  })

  // Linked prescriptions
  const { data: prescriptions = [], isLoading: isLoadingRx } = useQuery({
    queryKey: ['patient-prescriptions', id],
    queryFn: () => patientApi.getPatientPrescriptions(id!),
    enabled: !!id && activeTab === 'prescriptions',
  })

  // Linked lab results
  const { data: labResults = [], isLoading: isLoadingLab } = useQuery({
    queryKey: ['patient-labs', id],
    queryFn: () => patientApi.getPatientLabResults(id!),
    enabled: !!id && activeTab === 'laboratory',
  })

  // Linked admissions
  const { data: admissions = [], isLoading: isLoadingAdm } = useQuery({
    queryKey: ['patient-admissions', id],
    queryFn: () => patientApi.getPatientAdmissions(id!),
    enabled: !!id && activeTab === 'admissions',
  })

  // Linked billing
  const { data: invoices = [], isLoading: isLoadingBilling } = useQuery({
    queryKey: ['patient-invoices', id],
    queryFn: () => patientApi.getPatientInvoices(id!),
    enabled: !!id && activeTab === 'billing',
  })

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-4 animate-pulse p-4">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-32 bg-slate-100 rounded-lg" />
        <div className="h-64 bg-slate-100 rounded-lg" />
      </div>
    )
  }

  if (isError || !patient) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Failed to load patient record: {error?.message || 'Patient not found'}
        </div>
        <button
          onClick={() => navigate('/patients')}
          className="mt-4 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
        >
          Back to Patient Directory
        </button>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Patient Overview', icon: User },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'timeline', label: 'Clinical Timeline', icon: Activity },
    { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
    { id: 'laboratory', label: 'Lab Reports', icon: FlaskConical },
    { id: 'admissions', label: 'Inpatient / Wards', icon: Bed },
    { id: 'billing', label: 'Billing & Invoices', icon: CreditCard },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title={patient.patient_name || patient.username}
        subtitle="Patient 360° Comprehensive Electronic Health Record"
        backTo="/patients"
        backLabel="Back to Patient Directory"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/appointments/new?patient=${patient.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              Book Appointment
            </button>
            <button
              onClick={() => navigate(`/patients/${patient.id}/edit`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 bg-white border border-slate-200 rounded-md transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          </div>
        }
      />

      {/* Patient Key Demographics Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 font-bold text-lg flex items-center justify-center shrink-0 border border-blue-200">
              {patient.patient_name
                ? patient.patient_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : patient.username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-800">
                  {patient.patient_name || patient.username}
                </h2>
                <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  {patient.mrn}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  Blood: {patient.blood_group}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                <span>Age: <strong>{calculateAge(patient.date_of_birth)} yrs</strong></span>
                <span>•</span>
                <span className="capitalize">Gender: <strong>{patient.gender?.toLowerCase()}</strong></span>
                <span>•</span>
                <span>Facility: <strong>{patient.hospital_name || 'Central Hospital'}</strong></span>
                <span>•</span>
                <span>DOB: <strong className="font-mono">{patient.date_of_birth}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 w-full md:w-auto">
            {patient.phone && (
              <div className="flex items-center gap-1.5 text-slate-600 font-mono">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{patient.phone}</span>
              </div>
            )}
            {patient.email && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{patient.email}</span>
              </div>
            )}
          </div>
        </div>

        {patient.allergies && (
          <div className="mt-4 p-2.5 rounded-md bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-semibold">Known Allergies: </span>
              {patient.allergies}
            </div>
          </div>
        )}
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-md transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* TAB CONTENT: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Identity & Address */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              Identity & Address
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <DetailField label="Medical Record Number" value={patient.mrn} mono />
              <DetailField label="Date of Birth" value={patient.date_of_birth} mono />
              <DetailField label="Gender" value={patient.gender} />
              <DetailField label="Blood Group" value={patient.blood_group} />
              <DetailField label="Contact Phone" value={patient.phone || '—'} mono />
              <DetailField label="Account Email" value={patient.email || '—'} />
              <div className="col-span-2">
                <DetailField
                  label="Residential Address"
                  value={
                    [patient.address, patient.city, patient.state, patient.postal_code]
                      .filter(Boolean)
                      .join(', ') || 'No address provided'
                  }
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact & Insurance */}
          <div className="space-y-5">
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                Emergency Contact
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <DetailField label="Contact Name" value={patient.emergency_contact_name || '—'} />
                <DetailField label="Relationship" value={patient.emergency_contact_relationship || '—'} />
                <div className="col-span-2">
                  <DetailField label="Emergency Phone" value={patient.emergency_contact_phone || '—'} mono />
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Insurance Policy
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <DetailField label="Provider" value={patient.insurance_provider || 'Not insured / Self-pay'} />
                <DetailField label="Policy Number" value={patient.insurance_policy_number || '—'} mono />
                <DetailField label="Member ID" value={patient.insurance_member_id || '—'} mono />
                <DetailField label="Expiry Date" value={patient.insurance_expiry_date || '—'} mono />
              </div>
            </div>
          </div>

          {/* Clinical History Summary */}
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              Clinical Background & Medical History Summary
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {patient.medical_history || 'No preexisting conditions or background medical history documented.'}
            </p>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Appointments */}
      {activeTab === 'appointments' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Scheduled & Past Appointments
            </h3>
            <button
              onClick={() => navigate(`/appointments/new?patient=${patient.id}`)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              + Book New Appointment
            </button>
          </div>

          {isLoadingApts ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading appointments...</div>
          ) : appointments.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No appointments found for this patient.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {appointments.map((apt: AppointmentItem) => (
                <div key={apt.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-800">
                        {apt.appointment_reference}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {apt.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Doctor: {apt.doctor_name || apt.doctor} • Dept: {apt.department_name || apt.department}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-slate-700 font-mono">
                      {apt.appointment_date} at {apt.start_time}
                    </div>
                    <div className="text-[11px] text-slate-400">{apt.appointment_type}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
            Longitudinal Medical History Timeline
          </h3>
          {isLoadingTimeline ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading medical timeline...</div>
          ) : !timelineData || (Array.isArray(timelineData) && timelineData.length === 0) ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No clinical events recorded on the patient timeline yet.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {(Array.isArray(timelineData) ? timelineData : timelineData.results || []).map(
                (event: TimelineItem, idx: number) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-2xs" />
                    <div className="text-xs font-semibold text-slate-800">
                      {event.title || event.event_type || 'Clinical Event'}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {event.date || event.timestamp || 'Recorded'}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{event.description || event.notes || ''}</p>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Prescriptions */}
      {activeTab === 'prescriptions' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
            Prescription & Medication History
          </h3>
          {isLoadingRx ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading prescriptions...</div>
          ) : prescriptions.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No prescriptions found for this patient.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {prescriptions.map((rx: PrescriptionItem) => (
                <div key={rx.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-slate-800">
                      {rx.prescription_number || `RX-${rx.id}`}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Prescribed by Dr. {rx.doctor_name || rx.doctor} on {rx.created_at?.split('T')[0]}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {rx.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Laboratory */}
      {activeTab === 'laboratory' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
            Diagnostic & Laboratory Reports
          </h3>
          {isLoadingLab ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading laboratory reports...</div>
          ) : labResults.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No lab results available for this patient.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {labResults.map((lab: LabResultItem) => (
                <div key={lab.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-slate-800">
                      {lab.test_name || `Lab Order #${lab.id}`}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Result: <strong className="font-mono text-slate-800">{lab.result_value || 'Pending'}</strong> {lab.units} (Ref: {lab.reference_range || 'Normal'})
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      lab.is_abnormal
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {lab.is_abnormal ? 'ABNORMAL' : 'NORMAL'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Inpatient / Wards */}
      {activeTab === 'admissions' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
            Inpatient Ward & Bed Admissions
          </h3>
          {isLoadingAdm ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading admissions...</div>
          ) : admissions.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No inpatient admission history recorded.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {admissions.map((adm: AdmissionItem) => (
                <div key={adm.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-slate-800">
                      Admission #{adm.admission_number || adm.id}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Ward: {adm.ward_name || adm.ward} • Bed: {adm.bed_number || adm.bed}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {adm.status}
                    </span>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Admitted: {adm.admission_date}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Billing */}
      {activeTab === 'billing' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
            Invoices & Financial Records
          </h3>
          {isLoadingBilling ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No billing invoices found for this patient.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {invoices.map((inv: InvoiceItem) => (
                <div key={inv.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-slate-800 font-mono">
                      {inv.invoice_number}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Issued: {inv.issue_date} • Balance: <strong className="text-rose-600 font-mono">${inv.balance_due || '0.00'}</strong>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-800 font-mono">
                      ${inv.total_amount}
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PatientDetailsPage
