import React from 'react'
import {
  Calendar,
  UserPlus,
  Clock,
  Search,
  CalendarPlus,
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

interface ReceptionistDashboardProps {
  metrics?: DashboardMetricsResponse
}

export const ReceptionistDashboard: React.FC<ReceptionistDashboardProps> = ({ metrics }) => {
  const reception = metrics?.reception_summary
  const todayAppointments = reception?.today_appointments_count ?? 0
  const newRegistrations = reception?.new_patient_registrations ?? 0
  const pendingCheckins = reception?.pending_checkins_count ?? 0
  const requestedAdmissions = reception?.admissions_requested_count ?? 0

  return (
    <div className="space-y-6">
      <DashboardHeader
        hospitalName={metrics?.hospital_name || 'Central Hospital'}
        subtitle="Front Desk, Patient Admissions & Appointments Reception Station"
      />

      {/* Front-desk Daily Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Appointments"
          value={todayAppointments}
          description="Patients scheduled for outpatient OPD"
          icon={Calendar}
        />
        <StatCard
          title="New Patients Registered"
          value={newRegistrations}
          description="New hospital MRNs created today"
          icon={UserPlus}
        />
        <StatCard
          title="Pending Check-Ins"
          value={pendingCheckins}
          description="Awaiting front-desk arrival verification"
          icon={Clock}
        />
        <StatCard
          title="Admissions Requested"
          value={requestedAdmissions}
          description="Doctor requests awaiting ward bed assignment"
          icon={Bed}
        />
      </div>

      {/* Front Desk Quick Actions */}
      <div>
        <SectionHeader
          title="Reception Quick Actions"
          description="Primary front desk workflows"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <QuickActionCard
            title="Register New Patient"
            description="Create digital patient file & issue MRN"
            icon={UserPlus}
            to="/patients"
            badge="Phase 5"
          />
          <QuickActionCard
            title="Book Appointment"
            description="Reserve doctor slot for outpatient visit"
            icon={CalendarPlus}
            to="/appointments"
            badge="Phase 6"
          />
          <QuickActionCard
            title="Patient Master Search"
            description="Find patient by name, phone or MRN"
            icon={Search}
            to="/patients"
            badge="Phase 5"
          />
          <QuickActionCard
            title="Doctor OPD Schedule"
            description="Inspect doctor shift availability & timings"
            icon={Calendar}
            to="/appointments"
            badge="Phase 6"
          />
        </div>
      </div>

      {/* Queue & Front Desk Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader
            title="Today's OPD Arrival & Check-In Queue"
            description="Manage waiting room patient status"
            action={{ label: 'View full schedule', href: '/appointments' }}
          />
          <AppointmentSummary
            appointments={[]}
            emptyMessage="No patient arrivals currently pending in the waiting queue."
          />
        </div>

        <div className="space-y-6">
          <div>
            <SectionHeader
              title="Front Desk Tasks"
              description="Daily reception responsibilities"
            />
            <TaskList
              tasks={[
                {
                  id: 'rec-t1',
                  title: 'Print Today\'s OPD Doctor Patient Lists',
                  subtitle: 'Distribute rosters to consultation rooms',
                  priority: 'HIGH',
                  dueTime: '08:45 AM',
                },
                {
                  id: 'rec-t2',
                  title: 'Verify Inpatient Insurance Pre-authorizations',
                  subtitle: 'Coordinate with billing for admitted patients',
                  priority: 'MEDIUM',
                  dueTime: '11:00 AM',
                },
              ]}
            />
          </div>

          <div>
            <SectionHeader
              title="Reception Noticeboard"
              description="Front desk announcements"
            />
            <AlertList
              alerts={[
                {
                  id: 'rec-al-1',
                  title: 'OPD Registration Desks Active',
                  message: 'All queues synchronized with central scheduling.',
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

export default ReceptionistDashboard
