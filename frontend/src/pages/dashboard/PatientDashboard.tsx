import React from 'react'
import {
  Calendar,
  FileText,
  Pill,
  CreditCard,
  CalendarPlus,
} from 'lucide-react'
import {
  DashboardHeader,
  StatCard,
  SectionHeader,
  QuickActionCard,
  AppointmentSummary,
  AlertList,
} from '../../components/dashboard'

export const PatientDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <DashboardHeader
        hospitalName="MetroCare Hospital"
        subtitle="Patient Care Portal & Personal Health Records"
      />

      {/* Patient Key Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Upcoming Appointments"
          value="0"
          description="Next consultation bookings"
          icon={Calendar}
        />
        <StatCard
          title="Active Prescriptions"
          value="0"
          description="Current doctor medications"
          icon={Pill}
        />
        <StatCard
          title="Diagnostic Reports"
          value="0"
          description="Lab & imaging results released"
          icon={FileText}
        />
        <StatCard
          title="Outstanding Balance"
          value="₹0.00"
          description="Pending hospital invoices"
          icon={CreditCard}
        />
      </div>

      {/* Patient Quick Actions */}
      <div>
        <SectionHeader
          title="Patient Services"
          description="Manage your appointments, prescriptions and medical files"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <QuickActionCard
            title="Book Doctor Appointment"
            description="Choose specialist, date and preferred time slot"
            icon={CalendarPlus}
            to="/appointments"
            badge="Phase 6"
          />
          <QuickActionCard
            title="My Prescriptions"
            description="View dosage instructions and pharmacy orders"
            icon={Pill}
            to="/pharmacy"
            badge="Phase 8"
          />
          <QuickActionCard
            title="Medical Records"
            description="Access visit summaries, diagnoses & notes"
            icon={FileText}
            to="/medical-records"
            badge="Phase 7"
          />
          <QuickActionCard
            title="Hospital Invoices & Payments"
            description="View billing history and receipts"
            icon={CreditCard}
            to="/billing"
            badge="Phase 11"
          />
        </div>
      </div>

      {/* Appointments & Patient Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader
            title="Your Upcoming Consultations"
            description="Doctors and clinic timings"
            action={{ label: 'Book new appointment', href: '/appointments' }}
          />
          <AppointmentSummary
            appointments={[]}
            emptyMessage="You have no upcoming appointments scheduled. Click 'Book Doctor Appointment' to reserve a slot."
          />
        </div>

        <div className="space-y-4">
          <SectionHeader
            title="Health Portal Notices"
            description="Important updates"
          />
          <AlertList
            alerts={[
              {
                id: 'pat-al-1',
                title: 'Patient Portal Active',
                message: 'Your personal health account is connected to MetroCare Hospital records.',
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

export default PatientDashboard
