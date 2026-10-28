# Hospital Management System — Defect / Bug Report

**Document ID**: QA-BUG-001  
**Test Cycle**: Initial Senior QA Audit  
**Date**: October 28, 2026  

---

## Defect Inventory

### BUG-01: Patient Role Able to Read Staff Directory via Direct API Request

```text
Bug ID: BUG-001
Title: Patient accounts can query full hospital staff roster and designations via GET /api/v1/staff/
Module: Hospitals / Staff Management (Backend RBAC)
Severity: High
Priority: P1
Environment: Development / Test (Django WSGI on 127.0.0.1:8000)
Preconditions:
  - User logged in as a patient (e.g. 'patient_john', role: PATIENT)
  - Valid JWT access token acquired

Steps to Reproduce:
  1. Authenticate as patient_john using POST /api/v1/accounts/login/
  2. Send GET request to http://127.0.0.1:8000/api/v1/staff/ with Authorization: Bearer <patient_token>
  3. Inspect HTTP status code and response payload.

Test Data:
  - Endpoint: /api/v1/staff/
  - Header: Authorization: Bearer <patient_john_jwt>

Expected Result:
  - HTTP 403 Forbidden. Patients should not have programmatic access to internal staff employee IDs, joining dates, or internal designations.

Actual Result:
  - HTTP 200 OK. Returned complete list of staff profiles:
    [
      {"id": 1, "employee_id": "EMP-NURSE-001", "designation": "Head Inpatient Nurse", ...},
      {"id": 2, "employee_id": "EMP-RECEPT-001", "designation": "Chief Patient Registrar", ...}
    ]

Evidence:
  - backend/hospitals/views.py line 91:
    permission_classes = [IsHospitalAdminOrReadOnly]
    IsHospitalAdminOrReadOnly allows SAFE_METHODS (GET, HEAD, OPTIONS) to ANY authenticated user, including patients.

Possible Root Cause:
  - StaffViewSet uses IsHospitalAdminOrReadOnly instead of restricting read permissions to hospital internal staff or administrative roles.

Status: CLOSED (Remediated and Verified Fixed in QA Re-test Cycle 2)
Resolution / Fix:
  - Created IsStaffPersonnel permission class in backend/common/permissions.py checking user.is_authenticated and user.role in internal staff roles, explicitly denying PATIENT.
  - Assigned permission_classes = [IsStaffPersonnel] to StaffViewSet in backend/hospitals/views.py.
  - Verification: Re-run of TC-RBAC-01 returned HTTP 403 Forbidden with payload: {"detail": "You do not have permission to perform this action."}.
```

---

## Defect Triage & Summary

| Bug ID | Title | Severity | Priority | Status |
|---|---|---|---|---|
| **BUG-001** | Patient Role Able to Read Staff Directory via Direct API Request | **High** | **P1** | **CLOSED (VERIFIED FIXED)** |

### Remediation Details:
1. Created `IsStaffPersonnel` in `backend/common/permissions.py`.
2. Updated `StaffViewSet.permission_classes = [IsStaffPersonnel]` in `backend/hospitals/views.py`.
3. Verified via live HTTP test suite `qa_full_audit.py` that patient role requests to `/api/v1/staff/` receive strict `HTTP 403 Forbidden`.
