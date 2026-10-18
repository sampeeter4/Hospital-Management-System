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

### Phase 7
- [ ] Prescriptions & Pharmacy


