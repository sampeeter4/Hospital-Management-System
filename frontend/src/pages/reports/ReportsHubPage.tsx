import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  Clock,
  Bed,
  Pill,
  TestTube2,
  DollarSign,
} from 'lucide-react'
import { reportApi } from '../../services/api/reportApi'
import { PageHeader } from '../../components/ui'

const getTodayString = () => new Date().toISOString().split('T')[0]
const getThirtyDaysAgoString = () => {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
}

export const ReportsHubPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'patients' | 'appointments' | 'inpatient' | 'pharmacy' | 'laboratory' | 'billing'
  >('dashboard')

  const [startDate, setStartDate] = useState(getThirtyDaysAgoString)
  const [endDate, setEndDate] = useState(getTodayString)

  // Fetch report data based on active tab
  const { data: dashboardData, isLoading: isLoadingDash } = useQuery({
    queryKey: ['report-dashboard', { startDate, endDate }],
    queryFn: () => reportApi.getDashboardMetrics({ start_date: startDate, end_date: endDate }),
    enabled: activeTab === 'dashboard',
  })

  const { data: patientReportData, isLoading: isLoadingPat } = useQuery({
    queryKey: ['report-patients', { startDate, endDate }],
    queryFn: () => reportApi.getPatientsReport({ start_date: startDate, end_date: endDate }),
    enabled: activeTab === 'patients',
  })

  const { data: apptReportData, isLoading: isLoadingAppt } = useQuery({
    queryKey: ['report-appointments', { startDate, endDate }],
    queryFn: () => reportApi.getAppointmentsReport({ start_date: startDate, end_date: endDate }),
    enabled: activeTab === 'appointments',
  })

  const { data: inpatientReportData, isLoading: isLoadingInp } = useQuery({
    queryKey: ['report-inpatient', { startDate, endDate }],
    queryFn: () => reportApi.getInpatientReport({ start_date: startDate, end_date: endDate }),
    enabled: activeTab === 'inpatient',
  })

  const { data: pharmacyReportData, isLoading: isLoadingPharm } = useQuery({
    queryKey: ['report-pharmacy', { startDate, endDate }],
    queryFn: () => reportApi.getPharmacyReport({ start_date: startDate, end_date: endDate }),
    enabled: activeTab === 'pharmacy',
  })

  const { data: labReportData, isLoading: isLoadingLab } = useQuery({
    queryKey: ['report-lab', { startDate, endDate }],
    queryFn: () => reportApi.getLaboratoryReport({ start_date: startDate, end_date: endDate }),
    enabled: activeTab === 'laboratory',
  })

  const { data: billingReportData, isLoading: isLoadingBill } = useQuery({
    queryKey: ['report-billing', { startDate, endDate }],
    queryFn: () => reportApi.getBillingReport({ start_date: startDate, end_date: endDate }),
    enabled: activeTab === 'billing',
  })

  const handleExportCsv = () => {
    const baseUrl = 'http://127.0.0.1:8000/api/v1/reports'
    const exportUrl = `${baseUrl}/${activeTab}/?format=csv&start_date=${startDate}&end_date=${endDate}`
    window.open(exportUrl, '_blank')
  }

  const tabs = [
    { key: 'dashboard', label: 'Executive Overview', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { key: 'patients', label: 'Patients Demographics', icon: <Users className="w-3.5 h-3.5" /> },
    { key: 'appointments', label: 'Appointments Census', icon: <Clock className="w-3.5 h-3.5" /> },
    { key: 'inpatient', label: 'Inpatient & Wards', icon: <Bed className="w-3.5 h-3.5" /> },
    { key: 'pharmacy', label: 'Pharmacy & Stock', icon: <Pill className="w-3.5 h-3.5" /> },
    { key: 'laboratory', label: 'Lab & Diagnostics', icon: <TestTube2 className="w-3.5 h-3.5" /> },
    { key: 'billing', label: 'Billing & Collections', icon: <DollarSign className="w-3.5 h-3.5" /> },
  ] as const

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational & Clinical Reporting"
        subtitle="Cross-departmental analytics, census aggregates, financial reconciliation, and CSV data export"
      >
        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 shadow-sm transition-colors"
        >
          <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
          Export Report CSV
        </button>
      </PageHeader>

      {/* Date Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Date Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setStartDate(getThirtyDaysAgoString())
            setEndDate(getTodayString())
          }}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          Reset to Last 30 Days
        </button>
      </div>

      {/* Tab Selector */}
      <div className="flex items-center space-x-1 border-b border-slate-200 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const isActive = activeTab === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-t-md transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Report Content Panels */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-900">Hospital Operational Overview</h3>
            {isLoadingDash ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading aggregates...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block mb-1">Active Inpatient Beds</span>
                  <span className="text-xl font-bold text-slate-900">
                    {dashboardData?.active_inpatient_admissions ?? '—'}
                  </span>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block mb-1">Bed Occupancy Rate</span>
                  <span className="text-xl font-bold text-blue-700">
                    {dashboardData?.bed_occupancy_rate_percent ?? 0}%
                  </span>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block mb-1">Prescriptions Issued</span>
                  <span className="text-xl font-bold text-slate-900">
                    {dashboardData?.prescriptions_issued ?? '—'}
                  </span>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block mb-1">Critical Lab Results</span>
                  <span className="text-xl font-bold text-rose-700">
                    {dashboardData?.critical_lab_results ?? 0}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'patients' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Patient Demographics & Registrations</h3>
            {isLoadingPat ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading patient report...</div>
            ) : (
              <pre className="p-4 bg-slate-50 rounded border border-slate-200 text-xs overflow-x-auto text-slate-800">
                {JSON.stringify(patientReportData, null, 2)}
              </pre>
            )}
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Appointment Utilization & Clinic Volume</h3>
            {isLoadingAppt ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading appointment report...</div>
            ) : (
              <pre className="p-4 bg-slate-50 rounded border border-slate-200 text-xs overflow-x-auto text-slate-800">
                {JSON.stringify(apptReportData, null, 2)}
              </pre>
            )}
          </div>
        )}

        {activeTab === 'inpatient' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Ward Occupancy & Length of Stay</h3>
            {isLoadingInp ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading inpatient report...</div>
            ) : (
              <pre className="p-4 bg-slate-50 rounded border border-slate-200 text-xs overflow-x-auto text-slate-800">
                {JSON.stringify(inpatientReportData, null, 2)}
              </pre>
            )}
          </div>
        )}

        {activeTab === 'pharmacy' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Pharmacy Dispensing & Inventory Velocity</h3>
            {isLoadingPharm ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading pharmacy report...</div>
            ) : (
              <pre className="p-4 bg-slate-50 rounded border border-slate-200 text-xs overflow-x-auto text-slate-800">
                {JSON.stringify(pharmacyReportData, null, 2)}
              </pre>
            )}
          </div>
        )}

        {activeTab === 'laboratory' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Laboratory Turnaround Time & Volume</h3>
            {isLoadingLab ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading lab report...</div>
            ) : (
              <pre className="p-4 bg-slate-50 rounded border border-slate-200 text-xs overflow-x-auto text-slate-800">
                {JSON.stringify(labReportData, null, 2)}
              </pre>
            )}
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Financial Performance & Receivables</h3>
            {isLoadingBill ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading billing report...</div>
            ) : (
              <pre className="p-4 bg-slate-50 rounded border border-slate-200 text-xs overflow-x-auto text-slate-800">
                {JSON.stringify(billingReportData, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
export default ReportsHubPage
