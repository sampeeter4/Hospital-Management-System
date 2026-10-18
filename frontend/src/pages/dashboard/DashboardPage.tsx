import React from 'react'
import {
  Users,
  Calendar,
  FlaskConical,
  CreditCard,
  Plus,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { Button, Card } from '../../components/ui'

// Isolated Phase 1 Demo Statistics (To be connected to /api/v1/reports/dashboard/ in later phase)
const DEMO_METRICS = [
  {
    title: 'Total Patients',
    value: '2,845',
    delta: '+12 this week',
    isPositive: true,
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  {
    title: "Today's Appointments",
    value: '42',
    delta: '8 completed',
    isPositive: true,
    icon: Calendar,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
  },
  {
    title: 'Pending Lab Orders',
    value: '19',
    delta: '3 critical alerts',
    isPositive: false,
    icon: FlaskConical,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
  {
    title: 'Monthly Revenue',
    value: '₹14,82,500',
    delta: '+8.4% vs last mo',
    isPositive: true,
    icon: CreditCard,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
]

// Isolated Phase 1 Demo Appointments
const DEMO_APPOINTMENTS = [
  {
    id: 'APT-101',
    patient: 'Vikram Mehta',
    mrn: 'MRN-2026-0042',
    doctor: 'Dr. Rajesh Sharma',
    department: 'Cardiology',
    time: '09:30 AM',
    status: 'In Consultation',
    statusColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'APT-102',
    patient: 'Ananya Roy',
    mrn: 'MRN-2026-0089',
    doctor: 'Dr. Priya Patel',
    department: 'Pediatrics',
    time: '10:00 AM',
    status: 'Checked In',
    statusColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    id: 'APT-103',
    patient: 'Suresh Kumar',
    mrn: 'MRN-2026-0112',
    doctor: 'Dr. Rajesh Sharma',
    department: 'Cardiology',
    time: '10:30 AM',
    status: 'Confirmed',
    statusColor: 'bg-slate-50 text-slate-700 border-slate-200',
  },
  {
    id: 'APT-104',
    patient: 'Fatima Sheikh',
    mrn: 'MRN-2026-0145',
    doctor: 'Dr. Arvind Verma',
    department: 'Orthopedics',
    time: '11:00 AM',
    status: 'Confirmed',
    statusColor: 'bg-slate-50 text-slate-700 border-slate-200',
  },
]

// Isolated Phase 1 Recent Activity
const DEMO_ACTIVITIES = [
  {
    id: 1,
    time: '10 mins ago',
    desc: 'Lab verification completed for Lipid Profile (MRN-2026-0042)',
    icon: CheckCircle2,
    color: 'text-emerald-500',
  },
  {
    id: 2,
    time: '25 mins ago',
    desc: 'Elective admission admitted to Cardiac Ward Bed 04',
    icon: Clock,
    color: 'text-blue-500',
  },
  {
    id: 3,
    time: '45 mins ago',
    desc: 'Prescription dispensed: Atorvastatin 20mg (30 units)',
    icon: FileText,
    color: 'text-slate-500',
  },
  {
    id: 4,
    time: '1 hour ago',
    desc: 'Invoice #INV-2026-0038 paid via UPI (INR 2,510.00)',
    icon: ArrowUpRight,
    color: 'text-emerald-500',
  },
]

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Hospital Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time operational summary • MetroCare General Hospital
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Calendar className="w-3.5 h-3.5" />}
            onClick={() => alert('Book Appointment workflow will open in Appointments module.')}
          >
            New Booking
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => alert('Patient Registration workflow will open in Patients module.')}
          >
            Register Patient
          </Button>
        </div>
      </div>

      {/* 4 Key Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {DEMO_METRICS.map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.title} padding="sm" className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-500 block uppercase tracking-wider">
                    {metric.title}
                  </span>
                  <span className="text-2xl font-bold text-slate-900 mt-1 block">
                    {metric.value}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 mt-1 block">
                    {metric.delta}
                  </span>
                </div>
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${metric.bg} ${metric.color} border ${metric.border}`}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Main Content Split: Today's Appointments & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments List (2 Columns on Desktop) */}
        <div className="lg:col-span-2">
          <Card
            title="Today's Consultation Schedule"
            subtitle="Scheduled outpatient appointments for current shift"
            action={
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-blue-600 hover:text-blue-700"
                onClick={() => alert('Full schedule viewer')}
              >
                View all
              </Button>
            }
            padding="none"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4">Patient</th>
                    <th className="py-2.5 px-3">MRN</th>
                    <th className="py-2.5 px-3">Doctor & Dept</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {DEMO_APPOINTMENTS.map((apt) => (
                    <tr key={apt.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">{apt.patient}</td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{apt.mrn}</td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{apt.doctor}</div>
                        <div className="text-[10px] text-slate-400">{apt.department}</div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-600">{apt.time}</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${apt.statusColor}`}
                        >
                          {apt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Sidebar Column: Recent Activity Feed & Quick Notice */}
        <div className="space-y-6">
          <Card
            title="Clinical Audit Stream"
            subtitle="Recent hospital activity events"
            padding="sm"
          >
            <div className="space-y-3.5 pt-1">
              {DEMO_ACTIVITIES.map((act) => {
                const Icon = act.icon
                return (
                  <div key={act.id} className="flex items-start gap-2.5 text-xs">
                    <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${act.color}`} aria-hidden="true" />
                    <div className="flex-1">
                      <p className="text-slate-800 leading-snug">{act.desc}</p>
                      <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                        {act.time}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* System Status Banner */}
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-950">Frontend Phase 1 Foundation</h4>
                <p className="mt-1 text-[11px] text-blue-800 leading-relaxed">
                  Design system and layout verified. Actual backend DRF endpoints will be connected in subsequent phases.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage

