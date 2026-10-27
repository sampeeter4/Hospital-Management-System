import React from 'react'
import {
  Users,
  Calendar,
  Bed,
  CreditCard,
  UserPlus,
  CalendarPlus,
  FileText,
  BarChart3,
} from 'lucide-react'
import {
  DashboardHeader,
  StatCard,
  SectionHeader,
  QuickActionCard,
  AppointmentSummary,
  TaskList,
  AlertList,
} from '../../components/dashboard'
import { DashboardMetricsResponse } from '../../types/dashboard'

interface HospitalAdminDashboardProps {
  metrics?: DashboardMetricsResponse
}

export const HospitalAdminDashboard: React.FC<HospitalAdminDashboardProps> = ({ metrics }) => {
  const patientCount = metrics?.patients?.total_registrations_period ?? 0
  const appointmentsCount = metrics?.appointments?.total_appointments ?? 0
  const occupancyRate = metrics?.inpatient?.occupancy_rate_percent ?? 0
  const totalInvoiced = metrics?.billing?.total_invoiced ?? '₹0.00'
  const hospitalName = metrics?.hospital_name || 'Central Hospital'

  return (
    <div className="space-y-6">
      <DashboardHeader
        hospitalName={hospitalName}
        subtitle="Hospital Operations, Clinical Census & Administration"
      />

      {/* Operational Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Patients"
          value={patientCount}
          description="Hospital registry volume"
          icon={Users}
        />
        <StatCard
          title="Appointments Scheduled"
          value={appointmentsCount}
          description="Consultations recorded"
          icon={Calendar}
        />
        <StatCard
          title="Bed Occupancy"
          value={`${occupancyRate}%`}
          description={`${metrics?.inpatient?.occupied_beds ?? 0} of ${metrics?.inpatient?.total_beds ?? 0} occupied`}
          icon={Bed}
        />
        <StatCard
          title="Total Billing"
          value={typeof totalInvoiced === 'number' ? `₹${totalInvoiced.toLocaleString()}` : String(totalInvoiced)}
          description="Invoices generated"
          icon={CreditCard}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <SectionHeader
          title="Operational Quick Actions"
          description="Rapid access to hospital workflows"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <QuickActionCard
            title="Register Patient"
            description="Create new outpatient file with MRN"
            icon={UserPlus}
            to="/patients"
            badge="Phase 5"
          />
          <QuickActionCard
            title="Schedule Appointment"
            description="Book doctor consultation slot"
            icon={CalendarPlus}
            to="/appointments"
            badge="Phase 6"
          />
          <QuickActionCard
            title="Patient Census"
            description="Browse all registered hospital patients"
            icon={FileText}
            to="/patients"
            badge="Phase 5"
          />
          <QuickActionCard
            title="Hospital Reports"
            description="View departmental census and finance"
            icon={BarChart3}
            to="/reports"
            badge="Phase 12"
          />
        </div>
      </div>

      {/* Operations Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader
            title="Today's Consultation Schedule"
            description="Active clinical appointments queue"
            action={{ label: 'View all appointments', href: '/appointments' }}
          />
          <AppointmentSummary
            appointments={[]}
            emptyMessage="No consultation bookings found for today's roster."
          />
        </div>

        <div className="space-y-6">
          <div>
            <SectionHeader
              title="Administrative Tasks"
              description="Daily operational checklist"
            />
            <TaskList
              tasks={[
                {
                  id: 'task-1',
                  title: 'Review Department Doctor Rosters',
                  subtitle: 'Verify emergency and OPD coverage',
                  priority: 'HIGH',
                  dueTime: '11:00 AM',
                },
                {
                  id: 'task-2',
                  title: 'Inpatient Ward Census Verification',
                  subtitle: 'Audit bed occupancy figures',
                  priority: 'MEDIUM',
                  dueTime: '02:00 PM',
                },
              ]}
            />
          </div>

          <div>
            <SectionHeader
              title="Facility Alerts"
              description="Important notifications"
            />
            <AlertList
              alerts={[
                {
                  id: 'adm-alert-1',
                  title: 'System Operational',
                  message: 'All clinical and administrative services are operating normally.',
                  severity: 'INFO',
                  timestamp: 'Live',
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default HospitalAdminDashboard
