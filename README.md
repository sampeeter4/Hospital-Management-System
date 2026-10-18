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

### Phase 5
- [ ] Appointment Management & Scheduling
