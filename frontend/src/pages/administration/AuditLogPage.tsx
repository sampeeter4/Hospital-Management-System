import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileText,
  CreditCard,
  Bed,
  Search,
  Download,
  Eye,
  X,
  ShieldAlert,
  User,
} from 'lucide-react'
import { adminApi } from '../../services/api/adminApi'
import { ReportAuditEntry, ClinicalBillingAuditEntry } from '../../types/admin'
import { PageHeader, Card, Button, DataTable, Column } from '../../components/ui'

type AuditTab = 'reports' | 'billing' | 'inpatient'

export const AuditLogPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AuditTab>('reports')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<ReportAuditEntry | ClinicalBillingAuditEntry | null>(null)

  // Fetch queries
  const { data: reportLogs = [], isLoading: loadingReports } = useQuery({
    queryKey: ['reportAuditLogs'],
    queryFn: () => adminApi.getReportAuditLogs(),
    enabled: activeTab === 'reports',
  })

  const { data: billingLogs = [], isLoading: loadingBilling } = useQuery({
    queryKey: ['billingAuditLogs'],
    queryFn: () => adminApi.getBillingAuditLogs(),
    enabled: activeTab === 'billing',
  })

  const { data: inpatientLogs = [], isLoading: loadingInpatient } = useQuery({
    queryKey: ['inpatientAuditLogs'],
    queryFn: () => adminApi.getInpatientAuditLogs(),
    enabled: activeTab === 'inpatient',
  })

  // Export current tab logs to CSV
  const handleExportCSV = () => {
    const rows: string[] = []
    const filename = `audit-logs-${activeTab}.csv`

    if (activeTab === 'reports') {
      rows.push('ID,Timestamp,User,Report Type,Action,Hospital,Records Count,IP Address')
      reportLogs.forEach((l) => {
        rows.push(
          `"${l.id}","${l.timestamp}","${l.username}","${l.report_type}","${l.action}","${l.hospital_name || ''}","${l.records_count}","${l.ip_address}"`
        )
      })
    } else {
      const logs = activeTab === 'billing' ? billingLogs : inpatientLogs
      rows.push('ID,Created At,User,User Role,Patient MRN,Action,Resource Type,Resource ID,Description')
      logs.forEach((l) => {
        rows.push(
          `"${l.id}","${l.created_at}","${l.user_name || ''}","${l.user_role}","${l.patient_mrn || ''}","${l.action}","${l.resource_type}","${l.resource_id}","${(l.description || '').replace(/"/g, '""')}"`
        )
      })
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Report columns
  const reportColumns: Column<ReportAuditEntry>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (l) => (
        <span className="text-xs text-slate-600 font-mono">
          {new Date(l.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (l) => (
        <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-slate-400" />
          {l.username}
        </span>
      ),
    },
    {
      key: 'report_type',
      header: 'Report Domain',
      render: (l) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
          {l.report_type}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (l) => (
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded ${
            l.action === 'EXPORT_CSV'
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {l.action}
        </span>
      ),
    },
    {
      key: 'records',
      header: 'Records',
      render: (l) => <span className="text-xs font-medium text-slate-700">{l.records_count}</span>,
    },
    {
      key: 'ip',
      header: 'IP Address',
      render: (l) => <span className="text-xs text-slate-500 font-mono">{l.ip_address}</span>,
    },
    {
      key: 'actions',
      header: 'Inspect',
      render: (l) => (
        <button
          type="button"
          onClick={() => setSelectedEntry(l)}
          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
          title="Inspect Audit Metadata"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ]

  // Clinical/Billing columns
  const clinicalColumns: Column<ClinicalBillingAuditEntry>[] = [
    {
      key: 'timestamp',
      header: 'Created At',
      render: (l) => (
        <span className="text-xs text-slate-600 font-mono">
          {new Date(l.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'Actor',
      render: (l) => (
        <div>
          <span className="text-xs font-semibold text-slate-800 block">
            {l.user_name || 'System / Staff'}
          </span>
          <span className="text-[10px] text-slate-400 uppercase font-medium">{l.user_role}</span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (l) => (
        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
          {l.action}
        </span>
      ),
    },
    {
      key: 'target',
      header: 'Target Resource',
      render: (l) => (
        <div>
          <span className="text-xs font-medium text-slate-700 block">
            {l.resource_type} #{l.resource_id}
          </span>
          {l.patient_mrn && (
            <span className="text-[11px] text-slate-400 font-mono">MRN: {l.patient_mrn}</span>
          )}
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (l) => (
        <span className="text-xs text-slate-600 truncate max-w-xs block" title={l.description}>
          {l.description}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Inspect',
      render: (l) => (
        <button
          type="button"
          onClick={() => setSelectedEntry(l)}
          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
          title="Inspect Audit Metadata"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ]

  // Filter lists based on search
  const filteredReportLogs = reportLogs.filter(
    (l) =>
      l.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.report_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.ip_address.includes(searchQuery)
  )

  const activeClinicalLogs = activeTab === 'billing' ? billingLogs : inpatientLogs
  const filteredClinicalLogs = activeClinicalLogs.filter(
    (l) =>
      (l.user_name && l.user_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.patient_mrn && l.patient_mrn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.description && l.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const isCurrentLoading =
    activeTab === 'reports' ? loadingReports : activeTab === 'billing' ? loadingBilling : loadingInpatient

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospital System Audit Logs"
        subtitle="Immutable HIPAA and operational audit records across clinical reporting, transactions, and bed assignments"
        action={
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'reports'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Report & Export Logs</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {reportLogs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('billing')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'billing'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Financial & Billing Audit</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {billingLogs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inpatient')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'inpatient'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bed className="w-4 h-4" />
          <span>Inpatient & Admission Audit</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {inpatientLogs.length}
          </span>
        </button>
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search user, action, MRN, IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </Card>

      {/* Audit Data Table */}
      {activeTab === 'reports' ? (
        <DataTable
          columns={reportColumns}
          data={filteredReportLogs}
          isLoading={isCurrentLoading}
          keyExtractor={(l) => String(l.id)}
          emptyMessage="No report audit records found."
        />
      ) : (
        <DataTable
          columns={clinicalColumns}
          data={filteredClinicalLogs}
          isLoading={isCurrentLoading}
          keyExtractor={(l) => String(l.id)}
          emptyMessage="No clinical audit records found."
        />
      )}

      {/* Inspection Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full p-6 animate-in fade-in-50 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Audit Trail Entry #{selectedEntry.id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Raw Audit Payload & Metadata
                </span>
                <pre className="mt-1 p-3 bg-slate-900 text-slate-200 rounded-md text-[11px] font-mono overflow-auto max-h-60">
                  {JSON.stringify(selectedEntry, null, 2)}
                </pre>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-[11px] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Notice: Audit records are cryptographically timestamped and write-only. Deletion and modification are strictly prohibited.
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedEntry(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AuditLogPage
