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
│   │   ├── common/         # Layout navigation (Sidebar, TopNav)
│   │   ├── forms/          # Form-specific wrappers
│   │   └── ui/             # Design system components (Button, Input, Card, Spinner, etc.)
│   ├── layouts/            # AuthLayout, MainLayout
│   ├── pages/              # Views (auth, dashboard, errors)
│   ├── routes/             # Central route definitions
│   ├── services/           # Axios client and React Query configuration
│   ├── hooks/              # Reusable React hooks
│   ├── context/            # React Contexts
│   ├── types/              # TypeScript definitions
│   ├── utils/              # Formatting and helper utilities
│   ├── constants/          # Roles and API routes
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

