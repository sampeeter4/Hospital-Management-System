import { createBrowserRouter, Navigate } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import MainLayout from '../layouts/MainLayout'
import LoginPage from '../pages/auth/LoginPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import NotFoundPage from '../pages/errors/NotFoundPage'
import ForbiddenPage from '../pages/errors/ForbiddenPage'

export const router = createBrowserRouter([
  // Public Auth Routes
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
    ],
  },

  // Authenticated Application Core Routes (Phase 1 structure; RBAC guards will attach in Phase 2)
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
      // Placeholders for sidebar nav links to prevent 404 while in Phase 1
      {
        path: '/patients',
        element: (
          <div className="p-6 bg-white border border-slate-200 rounded-lg">
            <h2 className="text-base font-bold text-slate-900">Patients Module</h2>
            <p className="text-xs text-slate-500 mt-1">Foundation initialized. Full patient management will be built in subsequent frontend phases.</p>
          </div>
        ),
      },
      {
        path: '/appointments',
        element: (
          <div className="p-6 bg-white border border-slate-200 rounded-lg">
            <h2 className="text-base font-bold text-slate-900">Appointments Module</h2>
            <p className="text-xs text-slate-500 mt-1">Foundation initialized. Full scheduling workflows will be built in subsequent frontend phases.</p>
          </div>
        ),
      },
      {
        path: '/medical-records',
        element: (
          <div className="p-6 bg-white border border-slate-200 rounded-lg">
            <h2 className="text-base font-bold text-slate-900">Medical Records Module</h2>
            <p className="text-xs text-slate-500 mt-1">Foundation initialized. Clinical encounter documentation will be built in subsequent frontend phases.</p>
          </div>
        ),
      },
      {
        path: '/pharmacy',
        element: (
          <div className="p-6 bg-white border border-slate-200 rounded-lg">
            <h2 className="text-base font-bold text-slate-900">Pharmacy Module</h2>
            <p className="text-xs text-slate-500 mt-1">Foundation initialized. Inventory and dispensing will be built in subsequent frontend phases.</p>
          </div>
        ),
      },
      {
        path: '/laboratory',
        element: (
          <div className="p-6 bg-white border border-slate-200 rounded-lg">
            <h2 className="text-base font-bold text-slate-900">Laboratory Module</h2>
            <p className="text-xs text-slate-500 mt-1">Foundation initialized. Diagnostic orders and verification will be built in subsequent frontend phases.</p>
          </div>
        ),
      },
      {
        path: '/inpatient',
        element: (
          <div className="p-6 bg-white border border-slate-200 rounded-lg">
            <h2 className="text-base font-bold text-slate-900">Inpatient Module</h2>
            <p className="text-xs text-slate-500 mt-1">Foundation initialized. Bed allocations and admissions will be built in subsequent frontend phases.</p>
          </div>
        ),
      },
      {
        path: '/billing',
        element: (
          <div className="p-6 bg-white border border-slate-200 rounded-lg">
            <h2 className="text-base font-bold text-slate-900">Billing & Insurance Module</h2>
            <p className="text-xs text-slate-500 mt-1">Foundation initialized. Invoices, claims, and receipts will be built in subsequent frontend phases.</p>
          </div>
        ),
      },
      {
        path: '/reports',
        element: (
          <div className="p-6 bg-white border border-slate-200 rounded-lg">
            <h2 className="text-base font-bold text-slate-900">Reports Module</h2>
            <p className="text-xs text-slate-500 mt-1">Foundation initialized. Analytics and exports will be built in subsequent frontend phases.</p>
          </div>
        ),
      },
      {
        path: '/admin',
        element: (
          <div className="p-6 bg-white border border-slate-200 rounded-lg">
            <h2 className="text-base font-bold text-slate-900">Administration Module</h2>
            <p className="text-xs text-slate-500 mt-1">Foundation initialized. Hospital settings and user administration will be built in subsequent frontend phases.</p>
          </div>
        ),
      },
    ],
  },

  // Root redirect to /login
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },

  // Catch-all: Redirect unknown routes to 404
  {
    path: '*',
    element: <Navigate to="/404" replace />,
  },
])

export default router

