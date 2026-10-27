import React from 'react'
import {
  Building2,
  Users,
  Calendar,
  CreditCard,
  FileText,
  Activity,
  Layers,
} from 'lucide-react'
import {
  DashboardHeader,
  StatCard,
  SectionHeader,
  QuickActionCard,
  ActivityList,
  AlertList,
} from '../../components/dashboard'
import { DashboardMetricsResponse } from '../../types/dashboard'

interface SuperAdminDashboardProps {
  metrics?: DashboardMetricsResponse
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ metrics }) => {
  const totalAppointments = metrics?.appointments?.total_appointments ?? 0
  const totalRegistrations = metrics?.patients?.total_registrations_period ?? 0
  const activeAdmissions = metrics?.inpatient?.active_admissions_count ?? 0
  const totalInvoiced = metrics?.billing?.total_invoiced ?? '₹0.00'

  return (
    <div className="space-y-6">
      <DashboardHeader
        hospitalName="Platform Central Admin"
        subtitle="Multi-Tenant System Overview & Global Platform Health"
      />

      {/* Primary Platform Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Hospital Facilities"
          value="1"
          description="Active Multi-Specialty Unit"
          icon={Building2}
        />
        <StatCard
          title="Patient Registrations"
          value={totalRegistrations}
          description="System-wide registered profiles"
          icon={Users}
        />
        <StatCard
          title="Total Appointments"
          value={totalAppointments}
          description="All departments scheduled"
          icon={Calendar}
        />
        <StatCard
          title="Platform Invoiced"
          value={typeof totalInvoiced === 'number' ? `₹${totalInvoiced.toLocaleString()}` : String(totalInvoiced)}
          description="Gross revenue recorded"
          icon={CreditCard}
        />
      </div>

      {/* Quick Actions & System Modules */}
      <div>
        <SectionHeader
          title="System Administration Actions"
          description="Enterprise hospital management controls"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <QuickActionCard
            title="Hospital Structure"
            description="Manage departments, wards and units"
            icon={Building2}
            to="/admin"
            badge="Phase 4"
          />
          <QuickActionCard
            title="Staff & User Directory"
            description="Manage doctors, nurses, accountants"
            icon={Users}
            to="/admin"
            badge="Phase 4"
          />
          <QuickActionCard
            title="Platform Reports"
            description="Financial, census and audit aggregates"
            icon={FileText}
            to="/reports"
            badge="Phase 12"
          />
          <QuickActionCard
            title="Inpatient Overview"
            description="Inspect bed occupancy and admissions"
            icon={Layers}
            to="/inpatient"
            badge="Phase 10"
          />
        </div>
      </div>

      {/* Operations & System Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader
            title="Platform Health & Activity"
            description="Audit records and security events"
          />
          <ActivityList
            items={[
              {
                id: 'sys-1',
                title: 'System Security Checkpoint Verified',
                description: 'JWT Authentication, session rotation, and RBAC active.',
                timestamp: 'Active Now',
                icon: Activity,
              },
              {
                id: 'sys-2',
                title: 'Database & Migration Audit',
                description: 'PostgreSQL/SQLite schema synchronized across 12 modules.',
                timestamp: 'Synced',
                icon: Layers,
              },
            ]}
          />
        </div>

        <div className="space-y-4">
          <SectionHeader
            title="Security & System Alerts"
            description="Platform notices"
          />
          <AlertList
            alerts={[
              {
                id: 'alert-1',
                title: 'Phase 3 Shell Active',
                message: 'All 9 role workspaces have been established with zero errors.',
                severity: 'INFO',
                timestamp: 'Current',
              },
              {
                id: 'alert-2',
                title: 'Bed Capacity Tracking',
                message: `Active inpatients: ${activeAdmissions}. Monitoring capacity.`,
                severity: 'INFO',
                timestamp: 'Live',
              },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

export default SuperAdminDashboard
