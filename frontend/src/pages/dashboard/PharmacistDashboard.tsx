import React from 'react'
import {
  Pill,
  Package,
  AlertTriangle,
  ClipboardCheck,
  Search,
  Users,
  FileText,
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

interface PharmacistDashboardProps {
  metrics?: DashboardMetricsResponse
}

export const PharmacistDashboard: React.FC<PharmacistDashboardProps> = ({ metrics }) => {
  const pharmacy = metrics?.pharmacy_summary
  const totalMedicines = pharmacy?.total_medicines_count ?? 0
  const activeBatches = pharmacy?.active_batches_count ?? 0
  const lowStockCount = pharmacy?.low_stock_medicines_count ?? 0
  const dispensesCount = pharmacy?.dispenses_recorded_count ?? 0

  return (
    <div className="space-y-6">
      <DashboardHeader
        hospitalName={metrics?.hospital_name || 'Central Hospital'}
        subtitle="Hospital Pharmacy, Formulary & Medication Dispensing Station"
      />

      {/* Pharmacy Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Medicines"
          value={totalMedicines}
          description="Formulary items cataloged"
          icon={Pill}
        />
        <StatCard
          title="Active Stock Batches"
          value={activeBatches}
          description="Unexpired lots in pharmacy storage"
          icon={Package}
        />
        <StatCard
          title="Low Stock Alerts"
          value={lowStockCount}
          description="Items below minimum reorder point"
          icon={AlertTriangle}
        />
        <StatCard
          title="Dispenses Completed"
          value={dispensesCount}
          description="Prescriptions filled this period"
          icon={ClipboardCheck}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <SectionHeader
          title="Pharmacy Quick Actions"
          description="Medication fulfillment & stock management"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <QuickActionCard
            title="Prescriptions Queue"
            description="Review doctor e-prescriptions for dispensing"
            icon={FileText}
            to="/pharmacy"
            badge="Phase 8"
          />
          <QuickActionCard
            title="Medicine Inventory"
            description="Manage batches, expiry dates and stock"
            icon={Package}
            to="/pharmacy"
            badge="Phase 8"
          />
          <QuickActionCard
            title="Search Formulary"
            description="Check drug availability and pricing"
            icon={Search}
            to="/pharmacy"
            badge="Phase 8"
          />
          <QuickActionCard
            title="Patient Profiles"
            description="Verify patient allergies & prescription history"
            icon={Users}
            to="/patients"
            badge="Phase 5"
          />
        </div>
      </div>

      {/* Pharmacy Tasks & Stock Warnings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader
            title="Pharmacy Dispensing Tasks"
            description="Fulfillment queue for OPD and inpatient wards"
          />
          <TaskList
            tasks={[
              {
                id: 'ph-t1',
                title: 'Review Inpatient Unit Dose Cart (Ward A)',
                subtitle: 'Verify scheduled evening doses',
                priority: 'HIGH',
                dueTime: '11:00 AM',
              },
              {
                id: 'ph-t2',
                title: 'Stock Expiry Audit (Current Month)',
                subtitle: 'Inspect batches expiring within 30 days',
                priority: 'MEDIUM',
                dueTime: '03:00 PM',
              },
            ]}
          />
        </div>

        <div className="space-y-4">
          <SectionHeader
            title="Inventory Warnings"
            description="Stock alerts"
          />
          <AlertList
            alerts={[
              {
                id: 'ph-al-1',
                title: 'Stock Monitoring Active',
                message: `${lowStockCount} items currently marked below safe inventory thresholds.`,
                severity: lowStockCount > 0 ? 'WARNING' : 'INFO',
                timestamp: 'Live',
              },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

export default PharmacistDashboard

