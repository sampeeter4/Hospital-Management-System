import { createBrowserRouter, Navigate } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import MainLayout from '../layouts/MainLayout'
import LoginPage from '../pages/auth/LoginPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import NotFoundPage from '../pages/errors/NotFoundPage'
import ForbiddenPage from '../pages/errors/ForbiddenPage'
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

          // Role-Guarded Hospital Modules
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
                <div className="p-6 bg-white border border-slate-200 rounded-lg">
                  <h2 className="text-base font-bold text-slate-900">Patients Module</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Role-authorized access verified. Full patient management will be built in subsequent frontend phases.
                  </p>
                </div>
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
                <div className="p-6 bg-white border border-slate-200 rounded-lg">
                  <h2 className="text-base font-bold text-slate-900">Appointments Module</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Role-authorized access verified. Full scheduling workflows will be built in subsequent frontend phases.
                  </p>
                </div>
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
                <div className="p-6 bg-white border border-slate-200 rounded-lg">
                  <h2 className="text-base font-bold text-slate-900">Medical Records Module</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Role-authorized access verified. Clinical documentation will be built in subsequent frontend phases.
                  </p>
                </div>
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
                <div className="p-6 bg-white border border-slate-200 rounded-lg">
                  <h2 className="text-base font-bold text-slate-900">Pharmacy Module</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Role-authorized access verified. Inventory and dispensing will be built in subsequent frontend phases.
                  </p>
                </div>
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
                <div className="p-6 bg-white border border-slate-200 rounded-lg">
                  <h2 className="text-base font-bold text-slate-900">Laboratory Module</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Role-authorized access verified. Diagnostic orders and results will be built in subsequent frontend phases.
                  </p>
                </div>
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
                <div className="p-6 bg-white border border-slate-200 rounded-lg">
                  <h2 className="text-base font-bold text-slate-900">Inpatient Module</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Role-authorized access verified. Bed allocations and admissions will be built in subsequent frontend phases.
                  </p>
                </div>
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
                <div className="p-6 bg-white border border-slate-200 rounded-lg">
                  <h2 className="text-base font-bold text-slate-900">Billing & Insurance Module</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Role-authorized access verified. Invoices, claims, and receipts will be built in subsequent frontend phases.
                  </p>
                </div>
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
                <div className="p-6 bg-white border border-slate-200 rounded-lg">
                  <h2 className="text-base font-bold text-slate-900">Reports Module</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Role-authorized access verified. Analytics and dashboards will be built in subsequent frontend phases.
                  </p>
                </div>
              </RoleRoute>
            ),
          },
          {
            path: '/admin',
            element: (
              <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN]}>
                <div className="p-6 bg-white border border-slate-200 rounded-lg">
                  <h2 className="text-base font-bold text-slate-900">Administration Module</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Role-authorized access verified. Hospital settings and user administration will be built in subsequent frontend phases.
                  </p>
                </div>
              </RoleRoute>
            ),
          },
        ],
      },
    ],
  },

  // Root redirect: Redirect to /dashboard (if authenticated, handled by PublicRoute / ProtectedRoute)
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
