/**
 * Authoritative user roles defined by the Django backend User.Role TextChoices.
 * Source: backend/accounts/models.py
 */
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  HOSPITAL_ADMIN: 'HOSPITAL_ADMIN',
  DOCTOR: 'DOCTOR',
  NURSE: 'NURSE',
  RECEPTIONIST: 'RECEPTIONIST',
  LAB_TECHNICIAN: 'LAB_TECHNICIAN',
  PHARMACIST: 'PHARMACIST',
  ACCOUNTANT: 'ACCOUNTANT',
  PATIENT: 'PATIENT',
} as const

export type UserRole = (typeof ROLES)[keyof typeof ROLES]

export const ALL_ROLES: UserRole[] = Object.values(ROLES)

export const CLINICAL_ROLES: UserRole[] = [
  ROLES.DOCTOR,
  ROLES.NURSE,
  ROLES.LAB_TECHNICIAN,
  ROLES.PHARMACIST,
]

export const ADMINISTRATIVE_ROLES: UserRole[] = [
  ROLES.SUPER_ADMIN,
  ROLES.HOSPITAL_ADMIN,
  ROLES.RECEPTIONIST,
  ROLES.ACCOUNTANT,
]

export const ROLE_LABELS: Record<UserRole, string> = {
  [ROLES.SUPER_ADMIN]: 'Super Administrator',
  [ROLES.HOSPITAL_ADMIN]: 'Hospital Administrator',
  [ROLES.DOCTOR]: 'Doctor / Physician',
  [ROLES.NURSE]: 'Registered Nurse',
  [ROLES.RECEPTIONIST]: 'Receptionist / Admissions Desk',
  [ROLES.LAB_TECHNICIAN]: 'Laboratory Technician',
  [ROLES.PHARMACIST]: 'Pharmacist',
  [ROLES.ACCOUNTANT]: 'Accountant / Billing Admin',
  [ROLES.PATIENT]: 'Patient',
}

