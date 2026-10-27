import React from 'react'
import {
  Bed,
  Users,
  HeartPulse,
  ClipboardList,
  CheckCircle2,
  Calendar,
} from 'lucide-react'
import {
  DashboardHeader,
  StatCard,
  SectionHeader,
  QuickActionCard,
  TaskList,
  AlertList,
} from '../../components/dashboard'
import { DashboardMetricsResponse } from '../../types/dashboard'

interface NurseDashboardProps {
  metrics?: DashboardMetricsResponse
}

export const NurseDashboard: React.FC<NurseDashboardProps> = ({ metrics }) => {
  const inpatient = metrics?.inpatient_overview
  const totalBeds = inpatient?.total_beds ?? 0
  const occupiedBeds = inpatient?.occupied_beds ?? 0
  const availableBeds = inpatient?.available_beds ?? 0
  const occupancyRate = inpatient?.occupancy_rate_percent ?? 0
  const activeInpatients = inpatient?.active_inpatients_count ?? 0

  return (
    <div className="space-y-6">
      <DashboardHeader
        hospitalName={metrics?.hospital_name || 'Central Hospital'}
        subtitle="Nursing Station & Inpatient Ward Care Dashboard"
      />

      {/* Ward Status Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Inpatients"
          value={activeInpatients}
          description="Patients admitted under ward care"
          icon={Users}
        />
        <StatCard
          title="Bed Occupancy"
          value={`${occupancyRate}%`}
          description={`${occupiedBeds} of ${totalBeds} beds occupied`}
          icon={Bed}
        />
        <StatCard
          title="Available Beds"
          value={availableBeds}
          description="Ready for immediate emergency admission"
          icon={CheckCircle2}
        />
        <StatCard
          title="Admissions Today"
          value={inpatient?.admissions_today_count ?? 0}
          description="New admissions processed today"
          icon={Calendar}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <SectionHeader
          title="Nursing Quick Actions"
          description="Ward operations and routine clinical checks"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <QuickActionCard
            title="Inpatient Ward View"
            description="Inspect bed chart, rooms and ward census"
            icon={Bed}
            to="/inpatient"
            badge="Phase 10"
          />
          <QuickActionCard
            title="Patient Vital Signs"
            description="Record BP, pulse, temp, SpO2 & glucose"
            icon={HeartPulse}
            to="/medical-records"
            badge="Phase 7"
          />
          <QuickActionCard
            title="Patient Census"
            description="Look up admitted patient files and charts"
            icon={Users}
            to="/patients"
            badge="Phase 5"
          />
          <QuickActionCard
            title="Medication Administration"
            description="Verify doctor prescriptions & dose rounds"
            icon={ClipboardList}
            to="/pharmacy"
            badge="Phase 8"
          />
        </div>
      </div>

      {/* Main Shift Tasks & Ward Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader
            title="Shift Care Tasks & Vital Rounds"
            description="Scheduled patient assessments"
          />
          <TaskList
            tasks={[
              {
                id: 'nurse-t1',
                title: 'Morning Vitals Round (Ward General & Semi-Private)',
                subtitle: 'Record vitals for all admitted patients',
                priority: 'HIGH',
                dueTime: '08:30 AM',
              },
              {
                id: 'nurse-t2',
                title: 'Medication Administration Round 1',
                subtitle: 'Administer scheduled IV/Oral medications',
                priority: 'HIGH',
                dueTime: '10:00 AM',
              },
              {
                id: 'nurse-t3',
                title: 'Verify Pre-Op Fasting Status',
                subtitle: 'Confirm surgical patient prep protocols',
                priority: 'MEDIUM',
                dueTime: '11:30 AM',
              },
            ]}
          />
        </div>

        <div className="space-y-4">
          <SectionHeader
            title="Ward Alerts & Bed Notices"
            description="Capacity and emergency notices"
          />
          <AlertList
            alerts={[
              {
                id: 'nurse-al-1',
                title: 'Bed Allocation Updated',
                message: `${availableBeds} beds currently sanitized and ready for admission.`,
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

export default NurseDashboard
