import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Mail, Smartphone } from 'lucide-react'
import { notificationApi } from '../../services/api/notificationApi'
import { NotificationPreference } from '../../types/notifications'
import { PageHeader, FormSection } from '../../components/ui'

export const NotificationPreferencesPage: React.FC = () => {
  const queryClient = useQueryClient()

  const { data: pref, isLoading } = useQuery<NotificationPreference>({
    queryKey: ['notification-preferences'],
    queryFn: () => notificationApi.getPreferences(),
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<NotificationPreference>) => notificationApi.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
    },
  })

  const handleToggle = (key: keyof NotificationPreference, currentVal: boolean) => {
    updateMutation.mutate({ [key]: !currentVal })
  }

  if (isLoading || !pref) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Notification Delivery Preferences"
        subtitle="Manage communication channels, alert frequency, and clinical event notifications"
        backTo="/notifications"
        backLabel="Back to Notifications"
      />

      {/* Delivery Channels */}
      <FormSection
        title="Delivery Channels"
        description="Choose which communication mediums you receive alerts through"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 bg-slate-50/70 rounded-lg border border-slate-200">
            <div className="flex items-center space-x-3">
              <Bell className="w-4 h-4 text-blue-600" />
              <div>
                <h4 className="text-xs font-semibold text-slate-800">In-App Notification Bell</h4>
                <p className="text-[11px] text-slate-500">Real-time alerts inside the hospital application portal</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={pref.in_app_notifications_enabled}
              onChange={() =>
                handleToggle('in_app_notifications_enabled', pref.in_app_notifications_enabled)
              }
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50/70 rounded-lg border border-slate-200">
            <div className="flex items-center space-x-3">
              <Mail className="w-4 h-4 text-indigo-600" />
              <div>
                <h4 className="text-xs font-semibold text-slate-800">Email Notifications</h4>
                <p className="text-[11px] text-slate-500">Receive summaries and transactional receipts by email</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={pref.email_notifications_enabled}
              onChange={() =>
                handleToggle('email_notifications_enabled', pref.email_notifications_enabled)
              }
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50/70 rounded-lg border border-slate-200">
            <div className="flex items-center space-x-3">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <div>
                <h4 className="text-xs font-semibold text-slate-800">SMS Direct Alerts</h4>
                <p className="text-[11px] text-slate-500">Direct mobile messaging for urgent updates and appointment reminders</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={pref.sms_notifications_enabled}
              onChange={() =>
                handleToggle('sms_notifications_enabled', pref.sms_notifications_enabled)
              }
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
          </div>
        </div>
      </FormSection>

      {/* Clinical Event Categories */}
      <FormSection
        title="Clinical Event Subscriptions"
        description="Select specific categories of alerts you wish to be notified about"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 bg-slate-50/70 rounded-lg border border-slate-200">
            <div>
              <h4 className="text-xs font-semibold text-slate-800">Critical Laboratory Alerts</h4>
              <p className="text-[11px] text-slate-500">Urgent notifications for panic/critical abnormal lab results</p>
            </div>
            <input
              type="checkbox"
              checked={pref.critical_lab_alerts_enabled}
              onChange={() =>
                handleToggle('critical_lab_alerts_enabled', pref.critical_lab_alerts_enabled)
              }
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50/70 rounded-lg border border-slate-200">
            <div>
              <h4 className="text-xs font-semibold text-slate-800">Appointment Reminders</h4>
              <p className="text-[11px] text-slate-500">24-hour and 2-hour reminders for clinical consultations</p>
            </div>
            <input
              type="checkbox"
              checked={pref.appointment_reminders_enabled}
              onChange={() =>
                handleToggle('appointment_reminders_enabled', pref.appointment_reminders_enabled)
              }
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50/70 rounded-lg border border-slate-200">
            <div>
              <h4 className="text-xs font-semibold text-slate-800">Prescription & Dispensing Notices</h4>
              <p className="text-[11px] text-slate-500">Notices when medications are issued or ready for pharmacy collection</p>
            </div>
            <input
              type="checkbox"
              checked={pref.prescription_alerts_enabled}
              onChange={() =>
                handleToggle('prescription_alerts_enabled', pref.prescription_alerts_enabled)
              }
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50/70 rounded-lg border border-slate-200">
            <div>
              <h4 className="text-xs font-semibold text-slate-800">Billing & Payment Notices</h4>
              <p className="text-[11px] text-slate-500">Invoices issued, payment receipt acknowledgements, and overdue reminders</p>
            </div>
            <input
              type="checkbox"
              checked={pref.billing_alerts_enabled}
              onChange={() =>
                handleToggle('billing_alerts_enabled', pref.billing_alerts_enabled)
              }
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50/70 rounded-lg border border-slate-200">
            <div>
              <h4 className="text-xs font-semibold text-slate-800">Inpatient Admission & Bed Movements</h4>
              <p className="text-[11px] text-slate-500">Admissions, bed allocations, room transfers, and discharge notifications</p>
            </div>
            <input
              type="checkbox"
              checked={pref.admission_alerts_enabled}
              onChange={() =>
                handleToggle('admission_alerts_enabled', pref.admission_alerts_enabled)
              }
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
          </div>
        </div>
      </FormSection>
    </div>
  )
}
export default NotificationPreferencesPage
