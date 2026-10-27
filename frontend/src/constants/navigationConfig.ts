import React from 'react'
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Pill,
  FlaskConical,
  Bed,
  CreditCard,
  BarChart3,
  ShieldCheck,
  Building2,
  Layers,
  Stethoscope,
  UserCheck,
} from 'lucide-react'
import { ROLES, UserRole } from './roles'

export interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  allowedRoles: UserRole[]
  badge?: string
}

export const NAVIGATION_CONFIG: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    allowedRoles: Object.values(ROLES),
  },
  {
    name: 'Hospitals',
    href: '/hospitals',
    icon: Building2,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN],
  },
  {
    name: 'Departments',
    href: '/departments',
    icon: Layers,
    allowedRoles: [
      ROLES.SUPER_ADMIN,
      ROLES.HOSPITAL_ADMIN,
      ROLES.DOCTOR,
      ROLES.NURSE,
      ROLES.RECEPTIONIST,
    ],
  },
  {
    name: 'Doctor Directory',
    href: '/doctors',
    icon: Stethoscope,
    allowedRoles: [
      ROLES.SUPER_ADMIN,
      ROLES.HOSPITAL_ADMIN,
      ROLES.DOCTOR,
      ROLES.NURSE,
      ROLES.RECEPTIONIST,
    ],
  },
  {
    name: 'Staff Management',
    href: '/staff',
    icon: UserCheck,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN],
  },
  {
    name: 'Patients',
    href: '/patients',
    icon: Users,
    allowedRoles: [
      ROLES.SUPER_ADMIN,
      ROLES.HOSPITAL_ADMIN,
      ROLES.DOCTOR,
      ROLES.NURSE,
      ROLES.RECEPTIONIST,
    ],
  },
  {
    name: 'Appointments',
    href: '/appointments',
    icon: Calendar,
    allowedRoles: [
      ROLES.SUPER_ADMIN,
      ROLES.HOSPITAL_ADMIN,
      ROLES.DOCTOR,
      ROLES.NURSE,
      ROLES.RECEPTIONIST,
      ROLES.PATIENT,
    ],
  },
  {
    name: 'Medical Records',
    href: '/medical-records',
    icon: FileText,
    allowedRoles: [
      ROLES.SUPER_ADMIN,
      ROLES.HOSPITAL_ADMIN,
      ROLES.DOCTOR,
      ROLES.NURSE,
    ],
  },
  {
    name: 'Pharmacy',
    href: '/pharmacy',
    icon: Pill,
    allowedRoles: [
      ROLES.SUPER_ADMIN,
      ROLES.HOSPITAL_ADMIN,
      ROLES.PHARMACIST,
      ROLES.DOCTOR,
    ],
  },
  {
    name: 'Laboratory',
    href: '/laboratory',
    icon: FlaskConical,
    allowedRoles: [
      ROLES.SUPER_ADMIN,
      ROLES.HOSPITAL_ADMIN,
      ROLES.LAB_TECHNICIAN,
      ROLES.DOCTOR,
    ],
  },
  {
    name: 'Inpatient',
    href: '/inpatient',
    icon: Bed,
    allowedRoles: [
      ROLES.SUPER_ADMIN,
      ROLES.HOSPITAL_ADMIN,
      ROLES.DOCTOR,
      ROLES.NURSE,
      ROLES.RECEPTIONIST,
    ],
  },
  {
    name: 'Billing',
    href: '/billing',
    icon: CreditCard,
    allowedRoles: [
      ROLES.SUPER_ADMIN,
      ROLES.HOSPITAL_ADMIN,
      ROLES.ACCOUNTANT,
      ROLES.RECEPTIONIST,
      ROLES.PATIENT,
    ],
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: BarChart3,
    allowedRoles: [
      ROLES.SUPER_ADMIN,
      ROLES.HOSPITAL_ADMIN,
      ROLES.ACCOUNTANT,
      ROLES.DOCTOR,
    ],
  },
  {
    name: 'Administration Hub',
    href: '/admin',
    icon: ShieldCheck,
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN],
  },
]
