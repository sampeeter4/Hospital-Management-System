# Hospital Management System — Frontend Client

A professional, enterprise-grade healthcare management portal built with React, Vite, TypeScript, and Tailwind CSS.

## Technology Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 8 with `@tailwindcss/vite`
- **Styling**: Tailwind CSS v4 (Restrained healthcare color palette, Inter typography)
- **Routing**: React Router v7 (`createBrowserRouter`)
- **API Client**: Axios (pre-configured with JWT interceptor architecture)
- **State & Server Cache**: TanStack React Query v5
- **Forms & Validation**: React Hook Form + Zod
- **Icons**: Lucide React
- **Code Quality**: ESLint 9 + typescript-eslint

## Project Structure

```text
frontend/
├── public/
├── src/
│   ├── assets/             # Static graphics and icons
│   ├── components/         # Reusable UI components
│   │   ├── common/         # Layout navigation (Sidebar, TopNav, ModulePlaceholder)
│   │   ├── dashboard/      # Reusable dashboard widgets (StatCard, TaskList, AlertList, etc.)
│   │   ├── forms/          # Form-specific wrappers
│   │   └── ui/             # Design system components (Button, Input, Card, Spinner, etc.)
│   ├── layouts/            # AuthLayout, MainLayout
│   ├── pages/              # Views (auth, role dashboards, errors)
│   │   └── dashboard/      # Role-specific dashboard components
│   ├── routes/             # Central route definitions & route guards
│   ├── services/           # Axios client, Auth API, Dashboard API, QueryClient
│   ├── hooks/              # Reusable React hooks & React Query data hooks
│   ├── context/            # React AuthContext
│   ├── types/              # TypeScript definitions (auth, dashboard, roles)
│   ├── utils/              # Formatting and helper utilities
│   ├── constants/          # Roles, navigation matrix
│   ├── App.tsx             # Root application provider setup
│   ├── main.tsx            # Application entry point
│   └── index.css           # Tailwind CSS imports and font tokens
├── .env.example            # Environment template
├── .gitignore              # Git ignore rules
├── eslint.config.js        # ESLint flat configuration
├── package.json            # Scripts and dependencies
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite bundler configuration
```

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration points to the Django REST Framework backend at:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

### 3. Run Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:3000`.

### 4. Code Quality & Linting
```bash
npm run lint
```

### 5. Production Build
```bash
npm run build
```
Build output is emitted to `dist/`.

---

## Frontend Phase 3: Main Shell & Role-Based Dashboards

Frontend Phase 3 establishes the professional application shell and role-tailored dashboard workstations for all hospital personnel and patients.

### Supported User Roles
The application strictly enforces the 9 roles defined in the backend:
1. `SUPER_ADMIN` — System-wide multi-facility platform supervision.
2. `HOSPITAL_ADMIN` — Hospital operations, department oversight, and clinical census.
3. `DOCTOR` — Clinical workstation, OPD consultations, patient EMR review, and prescription orders.
4. `NURSE` — Ward bed occupancy, vital signs recording rounds, and inpatient monitoring.
5. `RECEPTIONIST` — Front desk arrivals, OPD check-ins, patient registration, and appointment scheduling.
6. `LAB_TECHNICIAN` — Diagnostic orders accessioning, specimen processing, and test result entry.
7. `PHARMACIST` — Formulary stock management, active batch tracking, and prescription dispensing.
8. `ACCOUNTANT` — Daily billing ledger, payment collections, invoice reconciliation, and insurance claims.
9. `PATIENT` — Patient portal for consultation appointments, active prescriptions, and billing receipts.

### Main Application Shell
- **Sidebar (`Sidebar.tsx`)**:
  - Dynamically filtered using `src/constants/navigationConfig.ts` so users only see routes permitted for their role.
  - Active navigation indicators with Lucide icons.
  - Responsive mobile drawer with backdrop overlay.
  - Integrated Sign Out action and secure connection badge.
- **Top Navigation (`TopNav.tsx`)**:
  - Dynamic breadcrumbs based on the active route.
  - Live unread notification indicator connected to `/api/v1/notifications/unread-count/`.
  - User profile menu showing authenticated full name, username, email, and formatted role badge.
- **Module Placeholders (`ModulePlaceholder.tsx`)**:
  - Dignified hospital-grade placeholders for later phases (e.g., Phase 5 Patients, Phase 6 Appointments) preventing broken routes or fake CRUD screens.

### Reusable Dashboard Components (`src/components/dashboard/`)
- `DashboardHeader`: Greeting, active user title, hospital facility scope, and formatted date.
- `StatCard`: Standardized metric card displaying title, value, context, and Lucide icon with restrained styling.
- `SectionHeader`: Section titles with optional actions and count badges.
- `QuickActionCard`: Role-authorized action button linking directly to workflows.
- `AppointmentSummary`: Tabular overview of appointments with patient name, MRN, department, and status.
- `TaskList`: Shift checklists with priority tags (`HIGH`, `MEDIUM`, `LOW`) and status tracking.
- `AlertList`: Facility and clinical alerts categorized by severity (`INFO`, `WARNING`, `DANGER`, `URGENT`).
- `StatusBadge`: Consistent color-coded badges for hospital statuses.
- `EmptyDashboardState`: Hospital-grade empty state preventing blank or broken screens.
- `DashboardSkeleton`: Pulse skeleton loader displayed while React Query fetches backend metrics.

### How Role-Based Dashboard Selection Works
- When an authenticated user visits `/dashboard`, `DashboardPage.tsx` accesses the current authenticated user's role from `useAuth()`.
- Staff roles query the backend `/api/v1/reports/dashboard/` endpoint via `useDashboardData()` which provides optimized role-tailored database aggregates (`workload`, `inpatient_overview`, `financial_summary`, `pharmacy_summary`, `laboratory_summary`, `reception_summary`, etc.).
- `DashboardPage` dispatches to the matching dedicated dashboard component (`SuperAdminDashboard`, `HospitalAdminDashboard`, `DoctorDashboard`, `NurseDashboard`, `ReceptionistDashboard`, `LabTechnicianDashboard`, `PharmacistDashboard`, `AccountantDashboard`, or `PatientDashboard`).
- Patients bypass staff report endpoints and render the simplified patient portal view.
