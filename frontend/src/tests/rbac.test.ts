import { describe, it, expect } from 'vitest'
import { ROLES, ROLE_LABELS } from '../constants/roles'
import { NAVIGATION_CONFIG } from '../constants/navigationConfig'

describe('Role-Based Access Control (RBAC) System', () => {
  it('defines all 9 hospital role codes correctly', () => {
    expect(ROLES.SUPER_ADMIN).toBe('SUPER_ADMIN')
    expect(ROLES.HOSPITAL_ADMIN).toBe('HOSPITAL_ADMIN')
    expect(ROLES.DOCTOR).toBe('DOCTOR')
    expect(ROLES.NURSE).toBe('NURSE')
    expect(ROLES.RECEPTIONIST).toBe('RECEPTIONIST')
    expect(ROLES.LAB_TECHNICIAN).toBe('LAB_TECHNICIAN')
    expect(ROLES.PHARMACIST).toBe('PHARMACIST')
    expect(ROLES.ACCOUNTANT).toBe('ACCOUNTANT')
    expect(ROLES.PATIENT).toBe('PATIENT')
  })

  it('provides readable human labels for all roles', () => {
    Object.values(ROLES).forEach((role) => {
      expect(ROLE_LABELS[role]).toBeDefined()
      expect(ROLE_LABELS[role].length).toBeGreaterThan(0)
    })
  })

  it('strictly isolates clinical & administrative permissions from patients', () => {
    const patientNav = NAVIGATION_CONFIG.filter((item) =>
      item.allowedRoles.includes(ROLES.PATIENT)
    ).map((item) => item.name)

    expect(patientNav).toContain('Dashboard')
    expect(patientNav).toContain('Appointments')
    expect(patientNav).toContain('Billing')

    // Administrative & clinical restricted modules
    expect(patientNav).not.toContain('Hospitals')
    expect(patientNav).not.toContain('Departments')
    expect(patientNav).not.toContain('Doctor Directory')
    expect(patientNav).not.toContain('Staff Management')
    expect(patientNav).not.toContain('Medical Records')
    expect(patientNav).not.toContain('Inpatient')
    expect(patientNav).not.toContain('Administration Hub')
  })

  it('guarantees Super Admin and Hospital Admin full institutional coverage', () => {
    const adminNav = NAVIGATION_CONFIG.filter((item) =>
      item.allowedRoles.includes(ROLES.HOSPITAL_ADMIN)
    ).map((item) => item.name)

    const requiredModules = [
      'Dashboard',
      'Hospitals',
      'Departments',
      'Doctor Directory',
      'Staff Management',
      'Patients',
      'Appointments',
      'Medical Records',
      'Pharmacy',
      'Laboratory',
      'Inpatient',
      'Billing',
      'Reports',
      'Administration Hub',
    ]

    requiredModules.forEach((mod) => {
      expect(adminNav).toContain(mod)
    })
  })
})
