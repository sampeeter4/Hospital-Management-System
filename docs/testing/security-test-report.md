# Hospital Management System — Security Test Report

**Document ID**: QA-STR-001  
**Assessment Type**: Defensive Application Security & Authorization Audit  
**Assessor**: Senior QA / Security Test Engineer  
**Date**: October 28, 2026  

---

## 1. Executive Summary

A comprehensive application security and authorization assessment was conducted against the Hospital Management System API and Frontend architecture. Testing encompassed:
1. **Authentication Security & JWT Tokens**
2. **Insecure Direct Object References (IDOR)**
3. **Privilege Escalation**
4. **Injection Flaws (SQLi & XSS)**
5. **CORS & Session Controls**

The system demonstrated robust security defenses overall, passing **10 out of 11** security and authorization test cases. **One High-severity access control defect (BUG-001)** was identified regarding Staff directory readability by Patient accounts.

---

## 2. Vulnerability Breakdown

| Category | Tests Executed | Passed | Failed | Risk Rating |
|---|:---:|:---:|:---:|:---:|
| **Authentication & Tokens** | 5 | 5 | 0 | LOW |
| **Object-Level Authorization (IDOR)** | 2 | 2 | 0 | LOW |
| **Privilege Escalation** | 1 | 1 | 0 | LOW |
| **Injection (SQLi & XSS)** | 2 | 2 | 0 | LOW |
| **Role-Based API Access (RBAC)** | 1 | 0 | 1 | HIGH |

---

## 3. Specific Security Findings

### 3.1 IDOR Prevention (VERIFIED SECURE)
- **Patient Isolation**: Tested whether `patient_john` could access `patient_maria`'s medical details (`GET /api/v1/patients/{maria_id}/`). The request was rejected with **HTTP 403 Forbidden**.
- **Financial Invoice Isolation**: Tested whether `patient_john` could access `patient_maria`'s paid invoice (`GET /api/v1/billing/invoices/{maria_inv_id}/`). The request was rejected with **HTTP 403 Forbidden**.

### 3.2 Privilege Escalation (VERIFIED SECURE)
- **Self-Registration Constraint**: Attempted to create a new user with `role="SUPER_ADMIN"` via `POST /api/v1/accounts/register/`. The request was blocked with **HTTP 400 Bad Request**; self-registration is strictly hard-coded to allow only the `PATIENT` role.

### 3.3 Injection Resistance (VERIFIED SECURE)
- **SQL Injection**: Inputted `' OR '1'='1` into API search parameters across patients and appointments. Django's parameterized ORM safely treated the payload as literal string characters; zero SQL syntax errors or unescaped records were exposed.
- **Cross-Site Scripting (XSS)**: Inputted `<script>alert('xss_test')</script>` into patient parameters. React's JSX DOM encoding and Django's serializer safely escaped the payload.

### 3.4 Discovered Vulnerability: BUG-001 (OPEN - HIGH)
- **Vulnerability**: Patient role accounts can query employee IDs and internal designations from `/api/v1/staff/`.
- **Root Cause**: `StaffViewSet` in `backend/hospitals/views.py` used `IsHospitalAdminOrReadOnly`. Because `IsHospitalAdminOrReadOnly` permits read methods (`GET`) to any authenticated user, patients can query the endpoint.
- **Remediation**: Update `StaffViewSet.permission_classes` to restrict read operations to staff roles (`SUPER_ADMIN`, `HOSPITAL_ADMIN`, `DOCTOR`, `NURSE`, `RECEPTIONIST`, `PHARMACIST`, `LAB_TECHNICIAN`, `ACCOUNTANT`).
