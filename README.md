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

## Modules

- Authentication & User Management
- Hospital Management
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

### Phase 3
- [ ] Hospital Structure & Department Management
