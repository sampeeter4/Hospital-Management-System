export const APP_NAME = 'MetroCare Hospital Management System'
export const APP_VERSION = '1.0.0'

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  HOSPITAL_ADMIN: 'HOSPITAL_ADMIN',
  DOCTOR: 'DOCTOR',
  NURSE: 'NURSE',
  RECEPTIONIST: 'RECEPTIONIST',
  PHARMACIST: 'PHARMACIST',
  LAB_TECHNICIAN: 'LAB_TECHNICIAN',
  ACCOUNTANT: 'ACCOUNTANT',
  PATIENT: 'PATIENT',
} as const

export type UserRole = (typeof ROLES)[keyof typeof ROLES]

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login/',
    REFRESH: '/auth/token/refresh/',
    PROFILE: '/auth/profile/',
    REGISTER: '/auth/register/',
  },
  HEALTH: '/health/',
} as const

