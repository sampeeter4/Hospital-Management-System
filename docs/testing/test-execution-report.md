# Hospital Management System — Test Execution Report

**Document ID**: QA-TER-001  
**Execution Timestamp**: 2026-10-28 17:08:36 IST  
**Environment**: Local Test Suite (Windows 11, Python 3.13.5, Node 22.17.0, Django 6.1.1, React 19)  
**Execution Agent**: Senior QA Engineer Automated Harness (`backend/qa_full_audit.py`)  

---

## 1. Execution Summary Table

| Category | Total Executed | Passed | Failed | Blocked | Pass Rate |
|---|:---:|:---:|:---:|:---:|:---:|
| **Environment & Infrastructure** | 3 | 3 | 0 | 0 | 100.0% |
| **Authentication & Token Lifecycle** | 8 | 8 | 0 | 0 | 100.0% |
| **Role-Based Access Control (RBAC)** | 6 | 6 | 0 | 0 | 100.0% |
| **Insecure Direct Object Reference (IDOR)** | 2 | 2 | 0 | 0 | 100.0% |
| **Defensive Security & Injection** | 3 | 3 | 0 | 0 | 100.0% |
| **Financial & Billing Arithmetic** | 2 | 2 | 0 | 0 | 100.0% |
| **Inpatient Bed Census Integrity** | 1 | 1 | 0 | 0 | 100.0% |
| **Pharmacy Inventory & Thresholds** | 3 | 3 | 0 | 0 | 100.0% |
| **UI & Theme Toggling** | 1 | 1 | 0 | 0 | 100.0% |
| **TOTAL** | **29** | **29** | **0** | **0** | **100.0%** |

---

## 2. Detailed Execution Log

```text
=================================================================
EXECUTING SENIOR QA AUTOMATED TEST SUITE (CYCLE 2 - POST REMEDIATION)
=================================================================

[PASS] TC-ENV-01 - Environment: System Health Endpoint Check
       HTTP 200 OK | Status: success | Services: {'database': 'healthy'}
[PASS] TC-ENV-02 - Environment: Swagger Documentation Endpoint
       HTTP 200 OK | drf-spectacular OpenAPI 3.0 schema rendered
[PASS] TC-ENV-03 - Environment: Frontend Application Bootstrap
       HTTP 200 OK | Vite 8 dev server responsive on 127.0.0.1:3000

[PASS] TC-AUTH-01 - Authentication: Valid Admin Login with JWT Generation
       HTTP 200 OK | Access & Refresh tokens generated (HS256)
[PASS] TC-AUTH-02 - Authentication: Login with Incorrect Password
       HTTP 401 Unauthorized | Credentials properly rejected
[PASS] TC-AUTH-03 - Authentication: Login with Non-existent Username
       HTTP 401 Unauthorized | User absence handled without leakage
[PASS] TC-AUTH-04 - Authentication: Login with Empty Credentials
       HTTP 400 Bad Request | Field-level validation active
[PASS] TC-AUTH-05 - Authentication: JWT Token Refresh
       HTTP 200 OK | Refresh token successfully exchanged for fresh access token
[PASS] TC-AUTH-06 - Authentication: Invalid Refresh Token Handling
       HTTP 401 Unauthorized | Forged token rejected
[PASS] TC-AUTH-07 - Authentication: Protected Profile Unauthenticated Request
       HTTP 401 Unauthorized | Guard blocked unauthenticated caller
[PASS] TC-AUTH-08 - Authentication: Authenticated Profile Retrieval
       HTTP 200 OK | Authenticated admin profile retrieved

[PASS] TC-RBAC-01 - RBAC: Patient Blocked from Staff Directory API
       HTTP 403 Forbidden | Blocked: {"detail": "You do not have permission to perform this action."}
       [VERIFIED FIXED: Remediated via IsStaffPersonnel permission guard]
[PASS] TC-RBAC-02 - RBAC: Patient Blocked from Inpatient Ward API
       HTTP 403 Forbidden | Ward configuration restricted
[PASS] TC-RBAC-03 - RBAC: Doctor Permitted to Access Patients List
       HTTP 200 OK | Doctor Dr. Sharma authorized
[PASS] TC-RBAC-04 - RBAC: Pharmacist Permitted to Access Medicines Inventory
       HTTP 200 OK | Pharmacist Alex Reed authorized
[PASS] TC-RBAC-05 - RBAC: Lab Tech Permitted to Access Diagnostic Catalogue
       HTTP 200 OK | Lab Technician David Wright authorized
[PASS] TC-RBAC-06 - RBAC: Accountant Permitted to Access Billing Invoices
       HTTP 200 OK | Accountant Lisa Davis authorized

[PASS] TC-IDOR-01 - Security / IDOR: Patient John Blocked from Viewing Patient Maria Record
       HTTP 403 Forbidden | Cross-patient record access blocked
[PASS] TC-IDOR-02 - Security / IDOR: Patient Blocked from Viewing Another Patient Invoice
       HTTP 403 Forbidden | Cross-patient invoice access blocked

[PASS] TC-SEC-01 - Security / SQLi: SQL Injection String in Search Query
       HTTP 200 OK | Handled safely as literal parameter string; zero SQL errors
[PASS] TC-SEC-02 - Security / XSS: XSS Script Tag in Search Parameters
       HTTP 200 OK | Escaped safely; no execution
[PASS] TC-SEC-03 - Security / Auth: Self-Registration Privilege Escalation (SUPER_ADMIN request)
       HTTP 400 Bad Request | Blocked non-PATIENT role registration

[PASS] TC-BILL-01-1 - Billing: Invoice #1 Balance Equation
       Balance Due: 0.00 (Total 135.00 - Paid 135.00) | Mathematically exact
[PASS] TC-BILL-01-2 - Billing: Invoice #2 Balance Equation
       Balance Due: 320.00 (Total 320.00 - Paid 0.00) | Mathematically exact

[PASS] TC-INP-01-1 - Inpatient: Ward W-GEN-01 Bed Census Integrity
       Total Beds (3) >= Occupied (1) + Available (2) | Verified consistent

[PASS] TC-PHARM-01-1 - Pharmacy: Medicine MED-AMX-500 Stock Integrity Check
       Stock: 250 units, Threshold: 50 units | Valid
[PASS] TC-PHARM-01-3 - Pharmacy: Medicine MED-ATV-020 Stock Integrity Check
       Stock: 180 units, Threshold: 50 units | Valid
[PASS] TC-PHARM-01-4 - Pharmacy: Medicine MED-MET-500 Stock Integrity Check
       Stock: 320 units, Threshold: 50 units | Valid

[PASS] TC-UI-01 - UI / Theme: Dark Mode Toggle
       Toggling adds/removes .dark class on html; persists in localStorage
```
