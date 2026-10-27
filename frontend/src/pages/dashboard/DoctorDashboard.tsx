import React from 'react'
import {
  Calendar,
  FileText,
  Pill,
  Clock,
  Stethoscope,
  Bed,
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

interface DoctorDashboardProps {
  metrics?: DashboardMetricsResponse
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ metrics }) => {
  const workload = metrics?.workload
  const todayAppointments = workload?.today_appointments_count ?? 0
  const upcomingAppointments = workload?.upcoming_appointments_count ?? 0
  const activeInpatients = workload?.assigned_active_inpatients_count ?? 0
  const encountersRecorded = workload?.encounters_recorded_count ?? 0

  return (
    <div className="space-y-6">
      <DashboardHeader
        hospitalName={metrics?.hospital_name || 'Central Hospital'}
        subtitle="Physician Clinical Console & Patient Care Station"
      />

      {/* Clinical Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Appointments"
          value={todayAppointments}
          description="Patients on consultation roster"
          icon={Calendar}
        />
        <StatCard
          title="Upcoming Queue"
          value={upcomingAppointments}
          description="Scheduled follow-up visits"
          icon={Clock}
        />
        <StatCard
          title="Assigned Inpatients"
          value={activeInpatients}
          description="Admitted patients under round care"
          icon={Bed}
        />
        <StatCard
          title="Clinical Encounters"
          value={encountersRecorded}
          description="Documentation completed"
          icon={FileText}
        />
      </div>

      {/* Doctor Quick Actions */}
      <div>
        <SectionHeader
          title="Clinical Quick Actions"
          description="Fast access to daily medical workflows"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <QuickActionCard
            title="Today's Schedule"
            description="View consultations and patient queue"
            icon={Calendar}
            to="/appointments"
            badge="Phase 6"
          />
          <QuickActionCard
            title="Patient Records (EMR)"
            description="Review patient clinical history & vitals"
            icon={FileText}
            to="/medical-records"
            badge="Phase 7"
          />
          <QuickActionCard
            title="Prescribe Medication"
            description="Issue e-prescription to hospital pharmacy"
            icon={Pill}
            to="/pharmacy"
            badge="Phase 8"
          />
          <QuickActionCard
            title="Order Lab Tests"
            description="Request blood work, radiology & pathology"
            icon={Stethoscope}
            to="/laboratory"
            badge="Phase 9"
          />
        </div>
      </div>

      {/* Consultations & Tasks Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader
            title="Today's Consultation Roster"
            description="Assigned patients waiting for examination"
            action={{ label: 'View all appointments', href: '/appointments' }}
          />
          <AppointmentSummary
            appointments={[]}
            emptyMessage="No consultations scheduled for your clinic today. Walk-in queue will appear here."
          />
        </div>

        <div className="space-y-6">
          <div>
            <SectionHeader
              title="Clinical Tasks & Pending Reviews"
              description="Actions requiring physician sign-off"
            />
            <TaskList
              tasks={[
                {
                  id: 'doc-t1',
                  title: 'Review Inpatient Ward Morning Rounds',
                  subtitle: 'Ward B - Check post-op patient vitals',
                  priority: 'HIGH',
                  dueTime: '10:30 AM',
                },
                {
                  id: 'doc-t2',
                  title: 'Sign Pending Discharge Summaries',
                  subtitle: '2 patients awaiting final discharge clearance',
                  priority: 'MEDIUM',
                  dueTime: '01:00 PM',
                },
              ]}
            />
          </div>

          <div>
            <SectionHeader
              title="Clinical Alerts"
              description="Critical alerts and notifications"
            />
            <AlertList
              alerts={[
                {
                  id: 'doc-al-1',
                  title: 'Laboratory Result Awaiting Review',
                  message: 'Routine tests will populate automatically when ordered.',
                  severity: 'INFO',
                  timestamp: 'Ready',
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DoctorDashboard
