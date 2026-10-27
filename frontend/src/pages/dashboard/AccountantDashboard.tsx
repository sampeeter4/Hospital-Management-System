import React from 'react'
import {
  CreditCard,
  Receipt,
  FileCheck,
  AlertCircle,
  BarChart3,
  ShieldCheck,
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

interface AccountantDashboardProps {
  metrics?: DashboardMetricsResponse
}

export const AccountantDashboard: React.FC<AccountantDashboardProps> = ({ metrics }) => {
  const fin = metrics?.financial_summary
  const currency = fin?.currency || 'INR'
  const symbol = currency === 'INR' ? '₹' : '$'

  const totalInvoiced = fin?.total_invoiced ?? '0.00'
  const totalCollected = fin?.total_collected ?? '0.00'
  const totalOutstanding = fin?.total_outstanding_balance ?? '0.00'
  const unpaidCount = fin?.unpaid_invoices_count ?? 0

  return (
    <div className="space-y-6">
      <DashboardHeader
        hospitalName={metrics?.hospital_name || 'Central Hospital'}
        subtitle="Hospital Billing, Collections & Insurance Claims Station"
      />

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Invoiced"
          value={typeof totalInvoiced === 'number' ? `${symbol}${totalInvoiced.toLocaleString()}` : `${symbol}${totalInvoiced}`}
          description="Gross billed amount this period"
          icon={Receipt}
        />
        <StatCard
          title="Collections Received"
          value={typeof totalCollected === 'number' ? `${symbol}${totalCollected.toLocaleString()}` : `${symbol}${totalCollected}`}
          description="Paid via cash, card, UPI or gateway"
          icon={CreditCard}
        />
        <StatCard
          title="Outstanding Balance"
          value={typeof totalOutstanding === 'number' ? `${symbol}${totalOutstanding.toLocaleString()}` : `${symbol}${totalOutstanding}`}
          description="Unpaid & partially paid patient dues"
          icon={AlertCircle}
        />
        <StatCard
          title="Unpaid Invoices"
          value={unpaidCount}
          description="Bills awaiting settlement or claim"
          icon={FileCheck}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <SectionHeader
          title="Billing & Financial Quick Actions"
          description="Invoicing and payment processing workflows"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <QuickActionCard
            title="Hospital Invoices"
            description="Generate, review and print patient invoices"
            icon={Receipt}
            to="/billing"
            badge="Phase 11"
          />
          <QuickActionCard
            title="Record Payment"
            description="Process collections, issue receipts & settle dues"
            icon={CreditCard}
            to="/billing"
            badge="Phase 11"
          />
          <QuickActionCard
            title="Insurance Claims (TPA)"
            description="Manage pre-authorizations and submissions"
            icon={ShieldCheck}
            to="/billing"
            badge="Phase 11"
          />
          <QuickActionCard
            title="Financial Reports"
            description="Revenue, tax audits and daily cash summaries"
            icon={BarChart3}
            to="/reports"
            badge="Phase 12"
          />
        </div>
      </div>

      {/* Financial Worklist & Notices Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader
            title="Daily Billing & Reconciliation Tasks"
            description="Accounts closing and claim verification"
          />
          <TaskList
            tasks={[
              {
                id: 'acc-t1',
                title: 'Daily Cash Drawer & Card POS Reconciliation',
                subtitle: 'Verify OPD collection counter receipts',
                priority: 'HIGH',
                dueTime: '05:00 PM',
              },
              {
                id: 'acc-t2',
                title: 'Review Pending Inpatient Discharge Clearances',
                subtitle: 'Ensure all bed charges & medicines are billed',
                priority: 'MEDIUM',
                dueTime: '12:30 PM',
              },
            ]}
          />
        </div>

        <div className="space-y-4">
          <SectionHeader
            title="Billing Notices"
            description="Financial status"
          />
          <AlertList
            alerts={[
              {
                id: 'acc-al-1',
                title: 'Billing Ledgers Synchronized',
                message: 'All module billing events (pharmacy, lab, inpatient) flow into master ledger.',
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

export default AccountantDashboard
