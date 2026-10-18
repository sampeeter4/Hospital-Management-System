# Hospital Management System

A full-stack hospital management platform built using Django REST Framework, PostgreSQL, and React.

## Backend

- Python
- Django
- Django REST Framework
- PostgreSQL
- JWT Authentication (SimpleJWT)
- Role-Based Access Control (RBAC)
- Swagger/OpenAPI (drf-spectacular)
- Advanced Filtering & Search (django-filter)

## Modules

- Authentication & User Management
- Hospital Management & Organization Structure
- Patient Management
- Appointment Management & Scheduling
- Medical Records
- Prescriptions
- Pharmacy
- Laboratory
- Admissions
- Billing
- Notifications
- Reports

## Current Progress

### Phase 1 - Backend Foundation
- [x] Django setup
- [x] Django REST Framework
- [x] PostgreSQL configuration
- [x] Environment variables
- [x] CORS
- [x] API versioning
- [x] Swagger documentation
- [x] Health check API

### Phase 2 - Authentication & User Management
- [x] Custom User model with hospital roles
- [x] User registration with password hashing
- [x] JWT login (access & refresh tokens)
- [x] JWT token refresh
- [x] Protected profile endpoint (GET, PUT, PATCH)
- [x] Change password endpoint
- [x] Role-based permissions (Super Admin, Hospital Admin, Doctor, Nurse, Receptionist, Patient, etc.)
- [x] Django Admin user management integration
- [x] OpenAPI/Swagger documentation for all auth endpoints
- [x] Unit test suite for authentication and RBAC

### Phase 3 - Hospital Structure
- [x] `hospitals` app created
- [x] Hospital model (Registration number, contacts, location)
- [x] Department model with unique department code per hospital constraint
- [x] Doctor profile model linked 1:1 with User, Department, and Hospital
- [x] Staff profile model linked 1:1 with User, Department, and Hospital
- [x] Database migrations created and applied
- [x] Django admin registration with search & filters
- [x] ModelSerializers with related display fields
- [x] ModelViewSets with query optimization (`select_related`)
- [x] Router URLs for Hospitals, Departments, Doctors, and Staff
- [x] CRUD operations for all entities
- [x] Role-based access control (Admin write / Authenticated read)
- [x] Filtering (`django-filter`), search (`SearchFilter`), and ordering (`OrderingFilter`)
- [x] OpenAPI/Swagger documentation for all structure endpoints
- [x] Automated test suite verifying CRUD, constraints, filters, and permissions

### Phase 4 - Patient Management
- [x] `patients` app created
- [x] Patient model linked 1:1 with `accounts.User` and foreign key to `Hospital`
- [x] Automatic unique Medical Record Number (MRN) generation
- [x] Date of birth validation (future dates rejected)
- [x] Demographic fields: gender and blood group choices
- [x] Emergency contact details (name, relationship, phone)
- [x] Clinical profile fields (allergies, medical history)
- [x] Insurance details (provider, policy number, member ID, expiry date)
- [x] ModelSerializers with validation and write protection for system/identity fields
- [x] Dedicated self-service `/api/v1/patients/me/` endpoint (GET, PUT, PATCH)
- [x] Standard CRUD `/api/v1/patients/` endpoints with DRF Router
- [x] Role-based access control (Patients restricted to self, Doctors/Nurses read-only, Admins/Receptionists full management, unauthorized staff blocked)
- [x] Search, filtering (gender, blood group, hospital), and pagination
- [x] Django admin integration with structured fieldsets and search
- [x] OpenAPI/Swagger documentation with drf-spectacular (0 errors/warnings)
- [x] Comprehensive automated test suite (13 new tests, 37 total tests passing)

### Phase 5 - Appointment & Scheduling
- [x] `appointments` app created
- [x] `DoctorAvailability` model with weekly recurring schedules, configurable slot durations (10, 15, 20, 30, 45, 60 mins), effective date windows, and overlap prevention
- [x] `Appointment` model with auto-generated unique references (`APT-YYYYMMDD-XXXX`), relations to Patient, Doctor, Hospital, Department, and status state machine
- [x] `AppointmentStatusHistory` model providing immutable audit trail for all status transitions with actor and reason tracking
- [x] Booking validation service preventing doctor double-booking, patient double-booking, schedule bounds violation, unaligned slots, and past dates
- [x] Available slot generation service dynamically computing unbooked time slots
- [x] State transition service with strict transition rules (PENDING -> CONFIRMED -> CHECKED_IN -> IN_PROGRESS -> COMPLETED; CANCELLED; NO_SHOW)
- [x] REST APIs for Doctor Availability CRUD and Appointment lifecycle workflows
- [x] Specialized action endpoints: `/my/`, `/available-slots/`, `/confirm/`, `/check-in/`, `/start/`, `/complete/`, `/cancel/`, `/reschedule/`, `/no-show/`, `/history/`
- [x] Role-based access control (RBAC): Patient self-service (book, cancel, reschedule, view own, confidential notes masked), Doctor clinical workflows, Receptionist desk management, Nurse check-in, unauthorized roles blocked
- [x] Search, filtering (doctor, patient, hospital, department, date, status, type), and pagination
- [x] Django Admin registration with tabular inlines for status history
- [x] OpenAPI/Swagger documentation with drf-spectacular
- [x] Comprehensive test suite covering availabilities, booking conflicts, state transitions, RBAC, and slot calculations

### Phase 6 - Medical Records & Clinical Management
- [x] `medical_records` app created
- [x] `ClinicalEncounter` model with unique references (`ENC-YYYYMMDD-XXXXXX`), relationship to Patient, Doctor, Hospital, Department, and Appointment (with cancellation/no-show validation)
- [x] `VitalSigns` model supporting multiple measurements per encounter, physiological range validation, and authoritative server-computed BMI (metric and imperial)
- [x] `EncounterDiagnosis` model supporting provisional, confirmed, and differential diagnoses, ICD-10 coding, and single primary diagnosis constraint
- [x] `ClinicalNote` model supporting structured SOAP documentation, draft/signed status, and patient portal visibility control
- [x] `ClinicalNoteAddendum` model enforcing immutable signed notes with auditable corrections and preserved original narrative
- [x] `MedicalHistoryEntry` model for longitudinal medical history (past medical, surgical, family, social, chronic conditions)
- [x] `ClinicalAuditLog` append-only audit trail tracking clinical events and modifications
- [x] Chronological Patient Medical Timeline endpoint (`/api/v1/medical-records/patients/{patient_id}/timeline/` and `/me/timeline/`)
- [x] Role-based access control (RBAC): Doctors (clinical authoring/signing/closing), Nurses (vitals recording), Patients (own records, patient-visible signed notes only, internal notes hidden), Receptionists & non-clinical staff blocked
- [x] Django Admin registration with inlines and privacy protection
- [x] OpenAPI/Swagger documentation with drf-spectacular (0 errors/warnings)
- [x] Automated test suite with 29 new tests (94 total tests passing across Phases 1-6)

### Phase 7 - Prescriptions & Pharmacy Management
- [x] `pharmacy` app created
- [x] `Medicine` catalogue model (generic name, brand name, dosage forms, active ingredients, strength, dispensing unit, low-stock threshold)
- [x] `PharmacyLocation` model providing physical inventory locations scoped to specific hospitals
- [x] `MedicineBatch` model with batch numbers, expiry dates, purchase/selling prices, and non-negative stock constraints
- [x] `StockMovement` immutable append-only audit trail logging receipts, dispenses, returns, adjustments, expired stock, and wastage
- [x] `Prescription` and `PrescriptionItem` models with unique references (`RX-YYYYMMDD-XXXXXX`), dosage instructions, frequencies, durations, and status lifecycle (`DRAFT`, `ISSUED`, `PARTIALLY_DISPENSED`, `DISPENSED`, `CANCELLED`)
- [x] `DispenseRecord` and `DispensedItem` models with unique references (`DISP-YYYYMMDD-XXXXXX`), atomic inventory deduction, and over-dispense prevention
- [x] Dispensing services with row-level locking (`select_for_update()`), partial dispensing, return/reversal workflows, and automated expiry quarantining
- [x] Allergy safety and clinical warning service checking active ingredients against patient recorded allergies with documented prescriber override requirement
- [x] Role-based access control (RBAC): Doctors (prescribing & issuing), Pharmacists (inventory receipts, adjustments, dispensing, returns), Patients (own prescriptions only), Nurses & non-clinical staff blocked
- [x] Django Admin registration with inlines, search, and filters
- [x] OpenAPI/Swagger documentation with drf-spectacular (0 errors/warnings)
- [x] Automated test suite with 21 new tests (115 total tests passing across Phases 1–7)

### Phase 8 - Laboratory & Diagnostics Management
- [x] `laboratory` app created
- [x] `LabTest` catalogue model (codes, categories, specimen matrices, collection/prep instructions, methodologies, turnaround times)
- [x] `LabTestParameter` model supporting numeric, qualitative, boolean, and textual observations
- [x] `LabReferenceRange` model supporting age- and gender-stratified normal ranges and critical low/high thresholds
- [x] `LabOrder` and `LabOrderItem` models with unique auto-generated references (`LAB-YYYYMMDD-XXXXXX`), priority management (ROUTINE, URGENT, STAT), and lifecycle tracking
- [x] `LabSpecimen` model with unique barcodes (`SPEC-YYYYMMDD-XXXXXX`), automated matrix-based specimen accessioning, collection location tracking, and rejection handling with documented clinical reasons
- [x] `LabResult` and `LabResultParameter` models with unique references (`RES-YYYYMMDD-XXXXXX`), automatic parameter evaluation (normal, low, high, abnormal), and critical alert detection
- [x] `LabResultCorrection` model providing append-only audited result corrections preserving original verified numbers and narrative
- [x] `CriticalResultNotification` model with unique references (`CRIT-YYYYMMDD-XXXXXX`) and clinician acknowledgement workflow
- [x] `LabAuditLog` immutable append-only laboratory audit trail tracking orders, specimens, results, corrections, and alerts
- [x] Specialized REST endpoints: `/api/v1/laboratory/tests/`, `/orders/`, `/orders/{id}/cancel/`, `/specimens/`, `/specimens/{id}/collect/`, `/specimens/{id}/receive/`, `/specimens/{id}/reject/`, `/results/`, `/results/enter/`, `/results/{id}/verify/`, `/results/{id}/correct/`, `/patients/me/results/`, `/patients/{id}/results/`, `/critical-notifications/`, `/critical-notifications/{id}/acknowledge/`, `/audit-logs/`
- [x] Role-based access control (RBAC): Doctors (ordering tests & acknowledging critical results), Lab Technicians (accessioning, processing, entering & verifying results, corrections), Nurses (specimen collection), Patients (own released results only; unverified drafts hidden), unauthorized staff blocked
- [x] Django Admin registration with tabular inlines for test parameters, reference ranges, order items, result parameters, and corrections
- [x] OpenAPI/Swagger documentation with drf-spectacular
- [x] Comprehensive test suite with 14 new tests (129 total tests passing across Phases 1–8)

### Phase 9 - Hospital Admissions, Beds & Wards Management
- [x] `inpatient` app created
- [x] `Ward` model associated with Hospital, optional department, ward types (General, Private, ICU, Pediatric, Maternity, etc.), gender policy, floor location, and safe deactivation rules
- [x] `Room` model linked to Ward with room numbers, room types, capacity constraints (enforcing bed count <= room capacity), and deactivation checks
- [x] `Bed` model with bed numbers, bed types (Standard, ICU, Pediatric, Bariatric, Electric, Isolation), operational statuses (`AVAILABLE`, `RESERVED`, `OCCUPIED`, `CLEANING`, `MAINTENANCE`, `INACTIVE`), and equipment details
- [x] `Admission` model with auto-generated references (`ADM-YYYYMMDD-XXXXXX`), relationship to Patient, Hospital, Attending Doctor, Department, Encounter, and Appointment, admission types (`ELECTIVE`, `EMERGENCY`, `TRANSFER`, `NEWBORN`, `OBSERVATION`), and status lifecycle (`REQUESTED`, `ADMITTED`, `DISCHARGED`, `CANCELLED`)
- [x] `BedAssignment` model maintaining immutable historical bed movements and active occupancy with conditional database constraints preventing double allocation
- [x] `BedReservation` model supporting scheduled bed reservations with expiry tracking and automated fulfillment on admission
- [x] `InpatientAuditLog` immutable append-only audit trail capturing ward/room/bed configuration, admissions, bed allocations, transfers, releases, and discharges
- [x] Reusable transactional services with concurrency-safe row-level locking (`select_for_update()`): `admit_patient`, `transfer_patient`, `discharge_patient`, `update_bed_operational_status`, `reserve_bed`, `cancel_bed_reservation`, and `calculate_occupancy_report`
- [x] Specialized REST endpoints:
  - Wards: `GET/POST /api/v1/inpatient/wards/`, `GET/PATCH /api/v1/inpatient/wards/{id}/`, `GET /api/v1/inpatient/wards/{id}/occupancy/`
  - Rooms: `GET/POST /api/v1/inpatient/rooms/`, `GET/PATCH /api/v1/inpatient/rooms/{id}/`
  - Beds: `GET/POST /api/v1/inpatient/beds/`, `GET/PATCH /api/v1/inpatient/beds/{id}/`, `GET /api/v1/inpatient/beds/available/`, `POST /api/v1/inpatient/beds/{id}/update-status/`, `POST /api/v1/inpatient/beds/{id}/reserve/`
  - Admissions: `GET/POST /api/v1/inpatient/admissions/`, `GET/PATCH /api/v1/inpatient/admissions/{id}/`, `POST /api/v1/inpatient/admissions/{id}/admit/`, `POST /api/v1/inpatient/admissions/{id}/transfer/`, `POST /api/v1/inpatient/admissions/{id}/discharge/`, `POST /api/v1/inpatient/admissions/{id}/cancel/`, `GET /api/v1/inpatient/admissions/{id}/bed-history/`
  - Bed Assignments: `GET /api/v1/inpatient/assignments/`
  - Occupancy: `GET /api/v1/inpatient/occupancy/`
  - Audit Logs: `GET /api/v1/inpatient/audit-logs/`
- [x] Role-based access control (RBAC): Doctors & Admins (admit, transfer, clinical discharge), Nurses (admit, transfer, operational bed status updates), Receptionists (admission requests, bed allocation), Patients (own admission data only), unauthorized staff blocked
- [x] Django Admin registration with tabular inlines for rooms, beds, and bed assignments
- [x] OpenAPI/Swagger documentation with drf-spectacular (0 errors/warnings)
- [x] Automated test suite with 16 new tests (**145 total tests passing** across Phases 1–9)

### Phase 10 - Billing, Payments & Insurance Management
- [x] `billing` app created and configured in `INSTALLED_APPS` and `urls.py`
- [x] `ServiceItem` model (service codes, name, category, hospital-scoped pricing, tax rate, active status, unique constraint per hospital)
- [x] `Invoice` model with auto-generated references (`INV-YYYYMMDD-XXXXXX`), relationship to Patient, Hospital, Admission, Appointment, and Encounter, status lifecycle (`DRAFT`, `ISSUED`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `VOID`), and balance due tracking
- [x] `InvoiceLineItem` model capturing immutable pricing snapshots, quantity, unit price, discounts, tax rates, calculated subtotals, line totals, and clinical module origin tracking
- [x] Automated bill generation services: `generate_invoice_from_appointment`, `generate_invoice_from_admission`, with duplicate invoice prevention
- [x] `Payment` model with auto-generated references (`PAY-YYYYMMDD-XXXXXX`), payment methods (CASH, CARD, UPI, BANK_TRANSFER, CHEQUE, INSURANCE, OTHER), client idempotency key enforcement, and payment receipts
- [x] `PaymentAllocation` model supporting partial payments, multi-invoice allocations, and allocation reversals
- [x] `Refund` model with references (`REF-YYYYMMDD-XXXXXX`), validation preventing refund exceeding payment, and execution lifecycle
- [x] `CreditNote` model with references (`CN-YYYYMMDD-XXXXXX`) for billing error corrections and balance reductions
- [x] `InsuranceProvider`, `PatientInsurancePolicy`, and `InsurancePreAuthorization` models supporting pre-auth approvals, partial approvals, and validity windows
- [x] `InsuranceClaim` model with references (`CLM-YYYYMMDD-XXXXXX`), adjudication decisions, and settlement payment recording cleanly separating insurance payments from patient responsibility
- [x] `BillingAuditLog` immutable append-only audit trail capturing financial transactions, voids, refunds, allocations, claims, and decisions
- [x] Reporting and analytics endpoints: `/api/v1/billing/reports/summary/`, `/api/v1/billing/reports/outstanding/`, and `/api/v1/billing/reports/collections/`
- [x] Specialized REST endpoints:
  - Service Items: `GET/POST /api/v1/billing/service-items/`, `GET/PATCH /api/v1/billing/service-items/{id}/`
  - Invoices: `GET/POST /api/v1/billing/invoices/`, `GET/PATCH /api/v1/billing/invoices/{id}/`, `POST /api/v1/billing/invoices/{id}/issue/`, `POST /api/v1/billing/invoices/{id}/void/`, `GET /api/v1/billing/invoices/{id}/receipt/`
  - Payments: `GET/POST /api/v1/billing/payments/`, `GET /api/v1/billing/payments/{id}/`, `POST /api/v1/billing/payments/{id}/reverse/`
  - Refunds: `GET/POST /api/v1/billing/refunds/`, `GET /api/v1/billing/refunds/{id}/`, `POST /api/v1/billing/refunds/{id}/approve/`, `POST /api/v1/billing/refunds/{id}/execute/`
  - Credit Notes: `GET/POST /api/v1/billing/credit-notes/`, `GET /api/v1/billing/credit-notes/{id}/`
  - Insurance Providers & Policies: `GET/POST /api/v1/billing/insurance-providers/`, `GET/POST /api/v1/billing/insurance-policies/`
  - Pre-Authorizations: `GET/POST /api/v1/billing/pre-authorizations/`, `POST /api/v1/billing/pre-authorizations/{id}/record-decision/`
  - Claims: `GET/POST /api/v1/billing/claims/`, `POST /api/v1/billing/claims/{id}/submit/`, `POST /api/v1/billing/claims/{id}/record-decision/`, `POST /api/v1/billing/claims/{id}/record-payment/`
  - Audit Logs: `GET /api/v1/billing/audit-logs/`
- [x] Role-based access control (RBAC): Accountants & Billing Admins (full financial CRUD, voids, refunds, credit notes, reports), Receptionists/Cashiers (record payments), Patients (own invoices, receipts, and claims only; cannot view others or void invoices), Clinical staff restricted according to least-privilege principles
- [x] Django Admin registration with tabular inlines for invoice lines and payment allocations
- [x] OpenAPI/Swagger documentation with drf-spectacular (0 errors/warnings)
- [x] Comprehensive automated test suite with 17 new tests (**162 total tests passing** across Phases 1–10)

### Phase 11 - Notifications & Reports
- [x] `notifications` and `reports` apps created and configured in `INSTALLED_APPS` and `urls.py`
- [x] `Notification` model with channels (IN_APP, EMAIL, SMS), categories (APPOINTMENT, ADMISSION, DISCHARGE, PRESCRIPTION, LABORATORY, BILLING, PAYMENT, INSURANCE, SYSTEM, REMINDER), priorities (LOW, NORMAL, HIGH, URGENT), read/unread status, and duplicate event prevention (`event_key`)
- [x] `NotificationPreference` model with user-controlled in-app and email toggles, category filtering, and mandatory system notification enforcement
- [x] `DeliveryAttempt` model with delivery states (`QUEUED`, `SENT`, `FAILED`, `RETRYING`), exponential retry backoff, error classifications, and provider reference logging
- [x] Reusable notification event service: `send_notification`, `notify_appointment_event`, `notify_admission_event`, `notify_prescription_event`, `notify_lab_result_event`, `notify_billing_event`
- [x] Safe email delivery service using Django's email backend with environment configuration
- [x] Automated appointment reminder service (`send_appointment_reminders`) scanning upcoming appointments, filtering out cancelled/completed bookings, and preventing duplicate reminders
- [x] Background processing management commands: `process_notification_queue` and `send_appointment_reminders`
- [x] `ReportAuditLog` append-only immutable audit trail recording access to dashboards, operational reports, and CSV exports
- [x] Role-customized Dashboard API (`/api/v1/reports/dashboard/`):
  - Doctors: today/upcoming appointments, assigned inpatients, clinical encounters
  - Nurses: ward capacity, occupied/available beds, occupancy rate, active admissions
  - Accountants: total invoiced, total collected, net collected, balance due, claims summary
  - Pharmacists: total medicines, low stock alerts, inventory valuation, dispenses
  - Lab Technicians: test volumes, verified results, critical alert notifications
  - Receptionists: new registrations, check-in queue, admissions requested
  - Super Admin & Hospital Admin: holistic hospital-wide operational and financial dashboard
  - Patients: explicitly forbidden (403) from general hospital dashboards
- [x] Operational report endpoints with date range filtering and aggregate calculations:
  - Patients: `GET /api/v1/reports/patients/`
  - Appointments: `GET /api/v1/reports/appointments/`
  - Inpatient: `GET /api/v1/reports/inpatient/`
  - Pharmacy: `GET /api/v1/reports/pharmacy/`
  - Laboratory: `GET /api/v1/reports/laboratory/`
  - Billing: `GET /api/v1/reports/billing/`
  - Insurance: `GET /api/v1/reports/insurance/`
  - Audit Logs: `GET /api/v1/reports/audit-logs/`
- [x] Secure CSV exports with spreadsheet formula injection protection (CWE-1236) and bounded row streaming limits
- [x] Cross-hospital data leakage prevention and least-privilege role permissions
- [x] Django Admin registration for notifications, preferences, delivery attempts, and report audit logs
- [x] OpenAPI/Swagger documentation with drf-spectacular (0 errors/warnings)
- [x] Automated test suite with 21 new tests (**183 total tests passing** across Phases 1–11)

### Phase 12
- [ ] Testing, Security & Optimization
