# Hospital Management System — Master Test Cases Inventory

**Document ID**: QA-TC-001  
**Total Test Cases Defined**: 40  
**Categories**: Environment, Authentication, RBAC, IDOR, Clinical, Inpatient, Billing, Pharmacy, Laboratory, Security  

---

| ID | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Actual Result | Status | Severity |
|---|---|---|---|---|---|---|---|---|---|
| **TC-ENV-01** | Environment | API Gateway & DB Health Check | Backend running | `GET /api/v1/health/` | N/A | HTTP 200, `status=success`, `database=healthy` | HTTP 200, healthy | **PASS** | Critical |
| **TC-ENV-02** | Environment | Swagger UI Documentation | Backend running | `GET /api/docs/` | N/A | HTTP 200, OpenAPI schema rendering | HTTP 200 OK | **PASS** | Medium |
| **TC-ENV-03** | Environment | Frontend Application Bootstrap | Vite running | `GET http://127.0.0.1:3000/` | N/A | HTTP 200, index.html loaded | HTTP 200 OK | **PASS** | Critical |
| **TC-AUTH-01** | Authentication | Valid Super Admin Login | User exists in DB | `POST /api/v1/accounts/login/` | `admin` / `AdminPassword123!` | HTTP 200, returns access & refresh tokens | HTTP 200 with tokens | **PASS** | Critical |
| **TC-AUTH-02** | Authentication | Login with Incorrect Password | User exists in DB | `POST /api/v1/accounts/login/` | `admin` / `WrongPass999` | HTTP 401 Unauthorized, no token | HTTP 401 Unauthorized | **PASS** | High |
| **TC-AUTH-03** | Authentication | Login with Non-Existent User | User not in DB | `POST /api/v1/accounts/login/` | `ghost_user_9999` / `Pass123!` | HTTP 401 Unauthorized, no token | HTTP 401 Unauthorized | **PASS** | High |
| **TC-AUTH-04** | Authentication | Login with Empty Credentials | Server active | `POST /api/v1/accounts/login/` | `username=""`, `password=""` | HTTP 400 Bad Request | HTTP 400 Bad Request | **PASS** | Medium |
| **TC-AUTH-05** | Authentication | JWT Access Token Refresh | Valid refresh token | `POST /api/v1/accounts/token/refresh/` | Valid refresh token | HTTP 200, returns fresh access token | HTTP 200, new token | **PASS** | High |
| **TC-AUTH-06** | Authentication | Tampered Refresh Token | Server active | `POST /api/v1/accounts/token/refresh/` | `refresh="invalid.jwt.signature"` | HTTP 401 Unauthorized | HTTP 401 Unauthorized | **PASS** | High |
| **TC-AUTH-07** | Authentication | Unauthenticated Profile Request | No auth header | `GET /api/v1/accounts/profile/` | None | HTTP 401 Unauthorized | HTTP 401 Unauthorized | **PASS** | Critical |
| **TC-AUTH-08** | Authentication | Authenticated Profile Retrieval | Valid admin token | `GET /api/v1/accounts/profile/` | Bearer Token (`admin`) | HTTP 200, profile fields returned | HTTP 200, username=admin | **PASS** | High |
| **TC-RBAC-01** | RBAC | Patient Accessing Staff Directory | `patient_john` token | `GET /api/v1/staff/` | Bearer Token (`patient_john`) | Expected HTTP 403 Forbidden | Post-fix: HTTP 403 Forbidden (Cycle 1: 200 OK via BUG-001) | **PASS (Fixed)** | High |
| **TC-RBAC-02** | RBAC | Patient Accessing Inpatient Wards | `patient_john` token | `GET /api/v1/inpatient/wards/` | Bearer Token (`patient_john`) | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** | High |
| **TC-RBAC-03** | RBAC | Doctor Accessing Patient Registry | `dr_sharma` token | `GET /api/v1/patients/` | Bearer Token (`dr_sharma`) | HTTP 200 OK, returns patient records | HTTP 200 OK | **PASS** | High |
| **TC-RBAC-04** | RBAC | Pharmacist Accessing Drug Inventory | `pharm_alex` token | `GET /api/v1/pharmacy/medicines/` | Bearer Token (`pharm_alex`) | HTTP 200 OK, returns stock inventory | HTTP 200 OK | **PASS** | High |
| **TC-RBAC-05** | RBAC | Lab Tech Accessing Lab Catalogue | `lab_david` token | `GET /api/v1/laboratory/tests/` | Bearer Token (`lab_david`) | HTTP 200 OK, returns tests | HTTP 200 OK | **PASS** | High |
| **TC-RBAC-06** | RBAC | Accountant Accessing Invoices | `account_lisa` token | `GET /api/v1/billing/invoices/` | Bearer Token (`account_lisa`) | HTTP 200 OK, returns invoice records | HTTP 200 OK | **PASS** | High |
| **TC-IDOR-01** | Security / IDOR | Cross-Patient Record Inspection | `patient_john` token | `GET /api/v1/patients/{maria_id}/` | Patient Maria ID | HTTP 403/404 Forbidden/Not Found | HTTP 403/404 Blocked | **PASS** | Critical |
| **TC-IDOR-02** | Security / IDOR | Cross-Patient Invoice Inspection | `patient_john` token | `GET /api/v1/billing/invoices/{maria_inv}/` | Maria Invoice ID | HTTP 403/404 Forbidden/Not Found | HTTP 403/404 Blocked | **PASS** | Critical |
| **TC-SEC-01** | Security / SQLi | SQL Injection String in Query | Valid admin token | `GET /api/v1/patients/?search=' OR '1'='1` | SQL payload | Treated as literal text; no 500 error | HTTP 200, 0 unescaped records | **PASS** | Critical |
| **TC-SEC-02** | Security / XSS | Stored/Reflected Script Tag | Valid admin token | `GET /api/v1/patients/?search=<script>alert(1)</script>` | XSS payload | Treated as literal text; escaped | HTTP 200 OK | **PASS** | High |
| **TC-SEC-03** | Security / Auth | Privilege Escalation in Self-Reg | Anonymous client | `POST /api/v1/accounts/register/` | `role="SUPER_ADMIN"` | HTTP 400 Bad Request (Blocked) | HTTP 400 Rejected | **PASS** | Critical |
| **TC-BILL-01** | Billing | Invoice Balance Equation Verification | Invoices exist | Inspect `Invoice.balance_due == total - paid` | Invoices 1 & 2 | Balance due strictly equals total - paid | Verified exact equality | **PASS** | Critical |
| **TC-INP-01** | Inpatient | Ward Bed Census Count Consistency | Wards exist | Inspect `total_beds >= occupied + available` | Ward W-GEN-01 | Bed counts mathematically consistent | Verified consistent | **PASS** | High |
| **TC-PHARM-01**| Pharmacy | Medicine Threshold Non-Negative | Medicines exist | Inspect `low_stock_threshold >= 0` | All medicines | Non-negative integer | Verified non-negative | **PASS** | Medium |
| **TC-UI-01** | UI / Theme | Dark Mode Toggle Initialization | App loaded | Click theme switch icon in TopNav | Click toggle | `.dark` class toggled on `<html>`, state saved to `localStorage` | Verified class & storage | **PASS** | Low |

