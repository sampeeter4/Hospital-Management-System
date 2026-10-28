export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS'

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'

export interface NotificationItem {
  id: number
  recipient: number
  recipient_username?: string
  recipient_email?: string
  title: string
  message: string
  notification_type: string
  channel: NotificationChannel
  priority: NotificationPriority
  priority_display?: string
  is_read: boolean
  read_at?: string | null
  resource_type?: string
  resource_id?: string
  action_url?: string
  created_at: string
}

export interface NotificationPreference {
  id: number
  user: number
  email_notifications_enabled: boolean
  in_app_notifications_enabled: boolean
  sms_notifications_enabled: boolean
  appointment_reminders_enabled: boolean
  critical_lab_alerts_enabled: boolean
  billing_alerts_enabled: boolean
  prescription_alerts_enabled: boolean
  admission_alerts_enabled: boolean
  updated_at: string
}
