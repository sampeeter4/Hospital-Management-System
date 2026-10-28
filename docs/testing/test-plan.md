# Hospital Management System — Master QA Test Plan

**Document ID**: QA-TP-001  
**Version**: 1.0  
**Author**: Senior QA Engineer  
**Date**: October 28, 2026  
**Status**: APPROVED & EXECUTED  

---

## 1. Introduction & Objectives

The purpose of this Test Plan is to define the testing strategy, scope, environment, and verification criteria for the **Hospital Management System (HMS)** enterprise application.

The HMS application is a multi-tier, mission-critical healthcare application comprising:
- **Backend**: Django REST Framework (DRF) 6.x, SimpleJWT, SQLite/PostgreSQL, OpenAPI/Swagger.
- **Frontend**: React 19, TypeScript (Strict), Vite 8, Tailwind CSS v4, TanStack Query v5, Axios, React Hook Form, Zod.
- **Access Control**: Role-Based Access Control (RBAC) across 9 user roles (`SUPER_ADMIN`, `HOSPITAL_ADMIN`, `DOCTOR`, `NURSE`, `RECEPTIONIST`, `LAB_TECHNICIAN`, `PHARMACIST`, `ACCOUNTANT`, `PATIENT`).

---

## 2. Scope of Testing

### 2.1 In-Scope Modules & Verification Areas
1. **Environment & Diagnostics**: Python 3.13, Node 22, Django ORM, `/api/v1/health/` probe.
2. **Authentication & Token Lifecycle**: JWT generation, refresh rotation, invalid token rejection, logout token revocation.
3. **Role-Based Access Control (RBAC)**: Route guards, navigation permissions, direct API authorization for all 9 roles.
4. **Insecure Direct Object Reference (IDOR)**: Patient demographic and financial invoice cross-tenant isolation.
5. **Hospital & Organization Structure**: Facilities, Departments, Doctors roster, Staff personnel.
6. **Patient Lifecycle Management**: Registration, MRN generation, blood group, allergies, demographic validation.
7. **Appointments & Scheduling**: Conflict detection, doctor availability, appointment status state transitions.
8. **Medical Records & EHR**: Clinical encounters, SOAP documentation, ICD-10 diagnostic coding.
9. **Prescriptions & Pharmacy Management**: E-prescribing, medication dispensing, stock decrement controls.
10. **Laboratory Diagnostics**: Orders, specimen collection & barcodes, test catalogue, multi-parameter result entry.
11. **Inpatient, Wards & Beds**: Ward census integrity, bed assignment locking, admission-to-discharge pipeline.
12. **Billing, Payments & Insurance**: Tariff calculations, tax & discount arithmetic, invoice balance verification.
13. **Defensive Security & Input Sanitization**: SQL injection (`' OR '1'='1`), XSS scripts, CSV formula injection protection.
14. **Dark Mode & Responsive UI**: Theme context toggling (`light` / `dark`), responsive breakpoints (desktop, tablet, mobile).

---

## 3. Test Methodology & Levels

- **Unit Testing**: Vitest suite for Zod validation schemas, financial calculation arithmetic, and RBAC matrix.
- **Integration Testing**: Automated HTTP probe suite (`backend/qa_full_audit.py`) testing live Django WSGI endpoints.
- **Security & Authorization Testing**: Defensive probing against IDOR, privilege escalation in registration, and token tampering.
- **Regression Testing**: Django automated test runner executing 198 cross-module tests.

---

## 4. Test Environment

| Component | Specification |
|---|---|
| **OS** | Windows 11 Enterprise |
| **Backend Runtime** | Python 3.13.5 (Virtualenv) |
| **Backend Framework** | Django 6.1.1 + Django REST Framework 3.18.1 |
| **Database** | SQLite3 (Development) / PostgreSQL (Target Production) |
| **Frontend Runtime** | Node.js v22.17.0, npm 11.2.0 |
| **Frontend Bundler** | Vite 8.3.4 + React 19.3.1 + TypeScript 6.0 |
| **API Host** | `http://127.0.0.1:8000/api/v1` |
| **Web Host** | `http://127.0.0.1:3000/` |

---

## 5. Pass / Fail Criteria

- **Pass**: 100% of Critical and High severity tests must pass with zero unhandled HTTP 500 errors.
- **Pass**: Zero data leakage between distinct patients or unauthenticated requests.
- **Pass**: Zero ESLint warnings (`npm run lint`), passing Vite production build (`npm run build`).
- **Fail**: Any authentication bypass, unhandled SQL exception, or unauthorized clinical data exposure.
