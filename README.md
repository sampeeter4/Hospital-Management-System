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
- Appointment Management
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

### Phase 4
- [ ] Patient Management
