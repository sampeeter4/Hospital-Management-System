# Hospital Management System — Frontend Client

A commercial-grade, enterprise healthcare management portal built with React 19, TypeScript, Vite 8, and Tailwind CSS v4, connecting to a Django REST Framework (DRF) backend with PostgreSQL.

---

## 🏛️ Technology Stack

- **Framework**: React 19 + TypeScript (Strict Mode)
- **Build & Bundler**: Vite 8 with native Rolldown code-splitting and `@tailwindcss/vite`
- **Styling**: Tailwind CSS v4 (Restrained clinical color palette: slate/blue/emerald/amber, Inter typography, 0 AI-style novelty gradients)
- **Routing**: React Router v7 (`createBrowserRouter`) with granular role guards
- **API Client**: Axios (automated JWT Bearer injection & refresh interceptor rotation)
- **State & Server Cache**: TanStack React Query v5
- **Form Management**: React Hook Form + Zod schema validation
- **Testing**: Vitest v5 (Native RBAC & Clinical calculation test suite)
- **Icons**: Lucide React
- **Code Quality**: ESLint 9 + typescript-eslint (Zero warnings enforcement)

---

## 📁 Project Architecture

```text
frontend/
├── public/                 # Static public assets
├── src/
│   ├── assets/             # Static graphics and icons
│   ├── components/
│   │   ├── common/         # Layout navigation (Sidebar, TopNav, ModulePlaceholder)
│   │   ├── dashboard/      # Role-specific KPI widgets (StatCard, TaskList, AlertList, etc.)
│   │   ├── forms/          # Form inputs, selectors, and field wrappers
│   │   └── ui/             # Core design system (Button, Card, DataTable, ConfirmDialog, etc.)
│   ├── layouts/            # AuthLayout, MainLayout
│   ├── pages/
│   │   ├── administration/ # User Management, Audit Logs, Diagnostics & Admin Hub
│   │   ├── appointments/   # Appointment booking, calendar roster, rescheduling
│   │   ├── auth/           # Login & JWT authentication
│   │   ├── billing/        # Invoices, Payments, Insurance Claims & Tariff builder
│   │   ├── dashboard/      # 9 Role-tailored dashboards
│   │   ├── departments/    # Clinical departments & hospital units
│   │   ├── doctors/        # Physician directory, credentials & consulting fees
│   │   ├── errors/         # 401 Unauthorized, 403 Forbidden, 404 Not Found
│   │   ├── hospitals/      # Hospital facilities, branches & license registration
│   │   ├── inpatient/      # Admissions, Ward Census matrix & Bed transfer
│   │   ├── laboratory/     # Lab orders, Specimen tracking, Diagnostic catalogue & Results
│   │   ├── medical-records/# Encounters, Clinical SOAP notes & Diagnoses
│   │   ├── notifications/  # Notification center & Delivery channel preferences
│   │   ├── patients/       # Patient registry, MRN search, Demographics & Details
│   │   ├── pharmacy/       # Prescriptions, Medication dispensing & Inventory
│   │   ├── reports/        # Cross-departmental operational analytics & CSV exports
│   │   ├── settings/       # Profile management & Security/Password settings
│   │   └── staff/          # Staff personnel roster & role provisioning
│   ├── routes/             # Central route definitions, RoleRoute & ProtectedRoute guards
│   ├── services/           # Axios client, Domain API services & QueryClient
│   ├── hooks/              # Custom React hooks & React Query data hooks
│   ├── context/            # React AuthContext
│   ├── types/              # Strict TypeScript interfaces matching DRF serializers
│   ├── constants/          # User roles, navigation matrix & system constants
│   ├── tests/              # Vitest RBAC and clinical validation test suites
│   ├── App.tsx             # Root application provider setup
│   ├── main.tsx            # Application bootstrap entry point
│   └── index.css           # Tailwind CSS imports and font tokens
├── .env.example            # Environment template
├── eslint.config.js        # ESLint flat configuration
├── package.json            # Scripts and dependencies
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite bundler & vendor chunking configuration
└── vitest.config.ts        # Vitest test runner configuration
```

---

## 🚀 Completed Frontend Modules (Phases 1 – 15)

| Phase | Module | Key Features & Implementation |
|---|---|---|
| **Phase 1** | **Design System & Foundation** | Production React 19 + TypeScript + Vite + Tailwind CSS foundation. Standardized healthcare UI primitives (`Button`, `Card`, `DataTable`, `Modal`, `PageHeader`, `Badge`, `Spinner`, `ConfirmDialog`). |
| **Phase 2** | **Authentication & RBAC** | JWT login (`POST /api/v1/accounts/login/`), access/refresh token rotation, Axios request/response interceptors, `AuthContext`, session persistence, and `ProtectedRoute` / `RoleRoute` guards. |
| **Phase 3** | **Application Shell & Dashboards** | Responsive collapsible sidebar, persistent top header with profile and notifications, and 9 tailored role dashboards (Super Admin, Hospital Admin, Doctor, Nurse, Receptionist, Lab Tech, Pharmacist, Accountant, Patient). |
| **Phase 4** | **Organization & Staff** | Organization management: Hospital facility CRUD (`/hospitals`), Departments (`/departments`), Doctor directory (`/doctors`), Staff personnel (`/staff`), and Administration Hub (`/admin`). |
| **Phase 5** | **Patient Management** | Patient registration and lifecycle (`/patients`), MRN generation, medical emergency contacts, blood group, allergies, pagination, and multi-field search. |
| **Phase 6** | **Appointments & Scheduling** | Booking workflow (`/appointments/new`), status transitions (`CONFIRMED`, `CHECKED_IN`, `COMPLETED`, `CANCELLED`, `NO_SHOW`), doctor availability roster, and schedule calendar. |
| **Phase 7** | **Medical Records & Clinical** | Electronic Health Records (`/medical-records`), Clinical Encounters, SOAP clinical notes (Subjective, Objective, Assessment, Plan), and ICD-10 diagnoses coding. |
| **Phase 8** | **Prescriptions & Pharmacy** | Electronic prescribing (`/pharmacy/prescriptions`), medication dispensing workflow, drug batches, expiration tracking, and inventory control (`/pharmacy/inventory`). |
| **Phase 9** | **Laboratory & Diagnostics** | Diagnostic order workflow (`/laboratory/orders`), specimen collection & barcode tracking, test catalogue (`/laboratory/catalogue`), and structured parameter result entry (`/laboratory/orders/:id/result`). |
| **Phase 10** | **Inpatient, Wards & Beds** | Inpatient dashboard (`/inpatient`), visual ward/bed census matrix, admission workflow (`/inpatient/admissions`), room transfers, and discharge clearing. |
| **Phase 11** | **Billing, Payments & Insurance** | Comprehensive financial workflow: Invoice generator with automated tariffs (`/billing/invoices`), printable invoice view with `@media print`, partial payments (`/billing/payments`), and Insurance claims (`/billing/insurance`). |
| **Phase 12** | **Notifications & Reports** | Real-time notification center (`/notifications`), channel preferences (email/SMS/in-app), and cross-departmental executive analytics with sanitized CSV export (`/reports`). |
| **Phase 13** | **Settings & Audit Logs** | Personal profile updates (`/settings/profile`), security & password changes (`/settings/security`), user provisioning (`/admin/users`), write-only HIPAA audit trail inspection (`/admin/audit-logs`), and server health probes (`/admin/health`). |
| **Phase 14** | **Integration & Performance** | Vitest integration test suite, verification of 198 backend tests + 10 frontend tests, optimized vendor code-splitting (`vendor-react`, `vendor-query`, `vendor-forms`, `vendor-icons`), zero build warnings, zero ESLint warnings. |
| **Phase 15** | **Polish & Portfolio Ready** | Enterprise documentation, complete RBAC matrix, cohesive navigation flows, end-to-end typing, production deployment readiness. |

---

## 🛡️ Role-Based Access Control (RBAC) Matrix

| Module / Page | Super Admin | Hospital Admin | Doctor | Nurse | Receptionist | Lab Tech | Pharmacist | Accountant | Patient |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Dashboard** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Hospitals** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Departments** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Doctor Directory** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Staff Management** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Patients** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Appointments** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Medical Records** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Pharmacy** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Laboratory** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Inpatient** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Billing / Invoices**| ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Reports Hub** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Administration Hub**| ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Audit Logs** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **System Health** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Profile & Security**| ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🛠️ Getting Started

### Prerequisites

- Node.js 20+ (Node 22 LTS recommended)
- npm 10+ or pnpm
- Django Backend running at `http://127.0.0.1:8000/`

### 1. Installation

```bash
cd frontend
npm install
```

### 2. Environment Setup

Create `.env` from template:

```bash
cp .env.example .env
```

Ensure `VITE_API_BASE_URL` points to your Django backend:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

### 3. Development Server

```bash
npm run dev
```

Application starts on `http://localhost:3000/`.

---

## 🧪 Testing & Code Quality

Run client-side Vitest test suite:

```bash
npm run test
```

Run TypeScript and ESLint checks (zero warnings policy):

```bash
npm run lint
```

Produce optimized production bundle:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```
