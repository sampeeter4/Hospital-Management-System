import React from 'react'
import {
  FlaskConical,
  AlertTriangle,
  CheckCircle2,
  Bell,
  FileText,
  Clock,
  Users,
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

interface LabTechnicianDashboardProps {
  metrics?: DashboardMetricsResponse
}

export const LabTechnicianDashboard: React.FC<LabTechnicianDashboardProps> = ({ metrics }) => {
  const lab = metrics?.laboratory_summary
  const totalOrders = lab?.total_lab_orders ?? 0
  const urgentOrders = lab?.urgent_orders_count ?? 0
  const verifiedResults = lab?.results_verified_count ?? 0
  const unacknowledgedCritical = lab?.unacknowledged_critical_count ?? 0

  return (
    <div className="space-y-6">
      <DashboardHeader
        hospitalName={metrics?.hospital_name || 'Central Hospital'}
        subtitle="Diagnostic Laboratory & Pathology Operations Station"
      />

      {/* Lab Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Lab Orders"
          value={totalOrders}
          description="Test orders received this period"
          icon={FlaskConical}
        />
        <StatCard
          title="Urgent / STAT Orders"
          value={urgentOrders}
          description="High-priority specimens for fast track"
          icon={AlertTriangle}
        />
        <StatCard
          title="Results Verified"
          value={verifiedResults}
          description="Reports finalized and released"
          icon={CheckCircle2}
        />
        <StatCard
          title="Critical Result Alerts"
          value={unacknowledgedCritical}
          description="Awaiting attending doctor confirmation"
          icon={Bell}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <SectionHeader
          title="Laboratory Quick Actions"
          description="Diagnostics and specimen tracking workflows"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <QuickActionCard
            title="Lab Test Orders"
            description="Process incoming test orders from doctors"
            icon={FlaskConical}
            to="/laboratory"
            badge="Phase 9"
          />
          <QuickActionCard
            title="Enter Test Results"
            description="Record analyte values and observations"
            icon={FileText}
            to="/laboratory"
            badge="Phase 9"
          />
          <QuickActionCard
            title="Specimen Accessioning"
            description="Log blood, urine and biopsy samples"
            icon={Clock}
            to="/laboratory"
            badge="Phase 9"
          />
          <QuickActionCard
            title="Patient Directory"
            description="Verify patient identification & barcodes"
            icon={Users}
            to="/patients"
            badge="Phase 5"
          />
        </div>
      </div>

      {/* Laboratory Worklist & Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader
            title="Diagnostic Worklist & Batch Processing"
            description="Pending specimen analysis runs"
          />
          <TaskList
            tasks={[
              {
                id: 'lab-t1',
                title: 'Morning Hematology & CBC Calibration',
                subtitle: 'Analyzer quality control verification',
                priority: 'HIGH',
                dueTime: '08:00 AM',
              },
              {
                id: 'lab-t2',
                title: 'Biochemistry Analyzer Batch 1',
                subtitle: 'Process fasting lipid & liver function panels',
                priority: 'MEDIUM',
                dueTime: '10:30 AM',
              },
            ]}
          />
        </div>

        <div className="space-y-4">
          <SectionHeader
            title="Critical Value Notifications"
            description="Immediate physician alerts"
          />
          <AlertList
            alerts={[
              {
                id: 'lab-al-1',
                title: 'Quality Control Calibrated',
                message: 'All analyzers are operating within normal reference thresholds.',
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

export default LabTechnicianDashboard
