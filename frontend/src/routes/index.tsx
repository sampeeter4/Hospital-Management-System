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
  ShieldCheck,
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

          // Role-Guarded Hospital Module Routes (Placeholders until dedicated phase)
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
          {
            path: '/admin',
            element: (
              <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN]}>
                <ModulePlaceholder
                  title="Hospital & Staff Administration"
                  phaseNumber={4}
                  description="Hospital configuration, departmental organization, doctor profiles, staff roles, and system audit logs."
                  icon={ShieldCheck}
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
