import { createBrowserRouter, Navigate } from 'react-router-dom'
import {
  Users,
  Calendar,
  FileText,
  Pill,
  FlaskConical,
  Bed,
  CreditCard,
  BarChart3,
} from 'lucide-react'

import AuthLayout from '../layouts/AuthLayout'
import MainLayout from '../layouts/MainLayout'
import LoginPage from '../pages/auth/LoginPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import NotFoundPage from '../pages/errors/NotFoundPage'
import ForbiddenPage from '../pages/errors/ForbiddenPage'
import ModulePlaceholder from '../components/common/ModulePlaceholder'
import ProtectedRoute from './ProtectedRoute'
import PublicRoute from './PublicRoute'
import RoleRoute from './RoleRoute'
import { ROLES } from '../constants/roles'

// Phase 4: Organization & Staff Management Pages
import AdminHubPage from '../pages/administration/AdminHubPage'
import HospitalListPage from '../pages/hospitals/HospitalListPage'
import HospitalDetailsPage from '../pages/hospitals/HospitalDetailsPage'
import HospitalCreatePage from '../pages/hospitals/HospitalCreatePage'
import HospitalEditPage from '../pages/hospitals/HospitalEditPage'

import DepartmentListPage from '../pages/departments/DepartmentListPage'
import DepartmentDetailsPage from '../pages/departments/DepartmentDetailsPage'
import DepartmentCreatePage from '../pages/departments/DepartmentCreatePage'
import DepartmentEditPage from '../pages/departments/DepartmentEditPage'

import DoctorListPage from '../pages/doctors/DoctorListPage'
import DoctorDetailsPage from '../pages/doctors/DoctorDetailsPage'
import DoctorCreatePage from '../pages/doctors/DoctorCreatePage'
import DoctorEditPage from '../pages/doctors/DoctorEditPage'

import StaffListPage from '../pages/staff/StaffListPage'
import StaffDetailsPage from '../pages/staff/StaffDetailsPage'
import StaffCreatePage from '../pages/staff/StaffCreatePage'
import StaffEditPage from '../pages/staff/StaffEditPage'

export const router = createBrowserRouter([
  // Public Routes (Redirect to /dashboard if already authenticated)
  {
    element: <PublicRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: '/login',
            element: <LoginPage />,
          },
        ],
      },
    ],
  },

  // Protected Application Routes (Requires valid authentication)
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            path: '/dashboard',
            element: <DashboardPage />,
          },
          {
            path: '/403',
            element: <ForbiddenPage />,
          },
          {
            path: '/404',
            element: <NotFoundPage />,
          },

          // Phase 4: Administration Hub
          {
            path: '/admin',
            element: (
              <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN]}>
                <AdminHubPage />
              </RoleRoute>
            ),
          },

          // Phase 4: Hospitals Module
          {
            path: '/hospitals',
            element: (
              <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN]}>
                <HospitalListPage />
              </RoleRoute>
            ),
          },
          {
            path: '/hospitals/new',
            element: (
              <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN]}>
                <HospitalCreatePage />
              </RoleRoute>
            ),
          },
          {
            path: '/hospitals/:id',
            element: (
              <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN]}>
                <HospitalDetailsPage />
              </RoleRoute>
            ),
          },
          {
            path: '/hospitals/:id/edit',
            element: (
              <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN]}>
                <HospitalEditPage />
              </RoleRoute>
            ),
          },

          // Phase 4: Departments Module
          {
            path: '/departments',
            element: (
              <RoleRoute
                allowedRoles={[
                  ROLES.SUPER_ADMIN,
                  ROLES.HOSPITAL_ADMIN,
                  ROLES.DOCTOR,
                  ROLES.NURSE,
                  ROLES.RECEPTIONIST,
                ]}
              >
                <DepartmentListPage />
              </RoleRoute>
            ),
          },
          {
            path: '/departments/new',
            element: (
              <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN]}>
                <DepartmentCreatePage />
              </RoleRoute>
            ),
          },
          {
            path: '/departments/:id',
            element: (
              <RoleRoute
                allowedRoles={[
                  ROLES.SUPER_ADMIN,
                  ROLES.HOSPITAL_ADMIN,
                  ROLES.DOCTOR,
                  ROLES.NURSE,
                  ROLES.RECEPTIONIST,
                ]}
              >
                <DepartmentDetailsPage />
              </RoleRoute>
            ),
          },
          {
            path: '/departments/:id/edit',
            element: (
              <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN]}>
                <DepartmentEditPage />
              </RoleRoute>
            ),
          },

          // Phase 4: Doctors Module
          {
            path: '/doctors',
            element: (
              <RoleRoute
                allowedRoles={[
                  ROLES.SUPER_ADMIN,
                  ROLES.HOSPITAL_ADMIN,
                  ROLES.DOCTOR,
                  ROLES.NURSE,
                  ROLES.RECEPTIONIST,
                ]}
              >
                <DoctorListPage />
              </RoleRoute>
            ),
          },
          {
            path: '/doctors/new',
            element: (
              <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN]}>
                <DoctorCreatePage />
              </RoleRoute>
            ),
          },
          {
            path: '/doctors/:id',
            element: (
              <RoleRoute
                allowedRoles={[
                  ROLES.SUPER_ADMIN,
                  ROLES.HOSPITAL_ADMIN,
                  ROLES.DOCTOR,
                  ROLES.NURSE,
                  ROLES.RECEPTIONIST,
                ]}
              >
                <DoctorDetailsPage />
              </RoleRoute>
            ),
          },
          {
            path: '/doctors/:id/edit',
            element: (
              <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN]}>
                <DoctorEditPage />
              </RoleRoute>
            ),
          },

          // Phase 4: Staff Module
          {
            path: '/staff',
            element: (
              <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN]}>
                <StaffListPage />
              </RoleRoute>
            ),
          },
          {
            path: '/staff/new',
            element: (
              <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN]}>
                <StaffCreatePage />
              </RoleRoute>
            ),
          },
          {
            path: '/staff/:id',
            element: (
              <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN]}>
                <StaffDetailsPage />
              </RoleRoute>
            ),
          },
          {
            path: '/staff/:id/edit',
            element: (
              <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN]}>
                <StaffEditPage />
              </RoleRoute>
            ),
          },

          // Placeholders for Later Phases (5–12)
          {
            path: '/patients',
            element: (
              <RoleRoute
                allowedRoles={[
                  ROLES.SUPER_ADMIN,
                  ROLES.HOSPITAL_ADMIN,
                  ROLES.DOCTOR,
                  ROLES.NURSE,
                  ROLES.RECEPTIONIST,
                ]}
              >
                <ModulePlaceholder
                  title="Patient Management"
                  phaseNumber={5}
                  description="Complete patient registration, demographic directory, outpatient files, MRN search, and medical histories."
                  icon={Users}
                />
              </RoleRoute>
            ),
          },
          {
            path: '/appointments',
            element: (
              <RoleRoute
                allowedRoles={[
                  ROLES.SUPER_ADMIN,
                  ROLES.HOSPITAL_ADMIN,
                  ROLES.DOCTOR,
                  ROLES.NURSE,
                  ROLES.RECEPTIONIST,
                  ROLES.PATIENT,
                ]}
              >
                <ModulePlaceholder
                  title="Appointments & Scheduling"
                  phaseNumber={6}
                  description="Consultation booking slots, doctor calendars, waiting queue management, check-in, and rescheduling."
                  icon={Calendar}
                />
              </RoleRoute>
            ),
          },
          {
            path: '/medical-records',
            element: (
              <RoleRoute
                allowedRoles={[
                  ROLES.SUPER_ADMIN,
                  ROLES.HOSPITAL_ADMIN,
                  ROLES.DOCTOR,
                  ROLES.NURSE,
                ]}
              >
                <ModulePlaceholder
                  title="Medical Records & Clinical Documentation"
                  phaseNumber={7}
                  description="Electronic medical records (EMR), SOAP clinical encounter notes, diagnostic summaries, and vital sign logs."
                  icon={FileText}
                />
              </RoleRoute>
            ),
          },
          {
            path: '/pharmacy',
            element: (
              <RoleRoute
                allowedRoles={[
                  ROLES.SUPER_ADMIN,
                  ROLES.HOSPITAL_ADMIN,
                  ROLES.PHARMACIST,
                  ROLES.DOCTOR,
                ]}
              >
                <ModulePlaceholder
                  title="Pharmacy & Prescriptions"
                  phaseNumber={8}
                  description="Formulary catalog, batch tracking, expiry monitoring, doctor e-prescriptions, and medication dispensing."
                  icon={Pill}
                />
              </RoleRoute>
            ),
          },
          {
            path: '/laboratory',
            element: (
              <RoleRoute
                allowedRoles={[
                  ROLES.SUPER_ADMIN,
                  ROLES.HOSPITAL_ADMIN,
                  ROLES.LAB_TECHNICIAN,
                  ROLES.DOCTOR,
                ]}
              >
                <ModulePlaceholder
                  title="Laboratory & Diagnostics"
                  phaseNumber={9}
                  description="Pathology & radiology test orders, specimen accessioning, analyte entry, report verification, and critical flags."
                  icon={FlaskConical}
                />
              </RoleRoute>
            ),
          },
          {
            path: '/inpatient',
            element: (
              <RoleRoute
                allowedRoles={[
                  ROLES.SUPER_ADMIN,
                  ROLES.HOSPITAL_ADMIN,
                  ROLES.DOCTOR,
                  ROLES.NURSE,
                  ROLES.RECEPTIONIST,
                ]}
              >
                <ModulePlaceholder
                  title="Inpatient, Beds & Wards"
                  phaseNumber={10}
                  description="Hospital ward census, bed allocations, room occupancy charts, admission orders, rounds, and discharge summaries."
                  icon={Bed}
                />
              </RoleRoute>
            ),
          },
          {
            path: '/billing',
            element: (
              <RoleRoute
                allowedRoles={[
                  ROLES.SUPER_ADMIN,
                  ROLES.HOSPITAL_ADMIN,
                  ROLES.ACCOUNTANT,
                  ROLES.RECEPTIONIST,
                  ROLES.PATIENT,
                ]}
              >
                <ModulePlaceholder
                  title="Billing, Payments & Insurance"
                  phaseNumber={11}
                  description="Patient invoicing, receipt generation, multi-mode payment collection, insurance pre-auth, and claims tracking."
                  icon={CreditCard}
                />
              </RoleRoute>
            ),
          },
          {
            path: '/reports',
            element: (
              <RoleRoute
                allowedRoles={[
                  ROLES.SUPER_ADMIN,
                  ROLES.HOSPITAL_ADMIN,
                  ROLES.ACCOUNTANT,
                  ROLES.DOCTOR,
                ]}
              >
                <ModulePlaceholder
                  title="Notifications & Reports"
                  phaseNumber={12}
                  description="Hospital operational metrics, clinical census reports, financial aggregates, CSV exports, and audit trails."
                  icon={BarChart3}
                />
              </RoleRoute>
            ),
          },
        ],
      },
    ],
  },

  // Root redirect: Redirect to /dashboard
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },

  // Catch-all: Redirect unknown routes to 404
  {
    path: '*',
    element: <Navigate to="/404" replace />,
  },
])

export default router
