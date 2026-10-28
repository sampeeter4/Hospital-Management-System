import os
import django
from datetime import date, time, timedelta
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from hospitals.models import Hospital, Department, Doctor, Staff
from patients.models import Patient
from appointments.models import Appointment
from inpatient.models import Ward, Room, Bed, Admission, BedAssignment
from pharmacy.models import Medicine
from laboratory.models import LabTest
from billing.models import Invoice, InvoiceLineItem, Payment

User = get_user_model()

def seed():
    print("Starting Demo Data Seeding...")

    # 1. Hospital Users
    users_data = [
        ("admin", "admin@metrocare.org", "AdminPassword123!", User.Role.SUPER_ADMIN, "Super", "Administrator"),
        ("hosp_admin", "hospadmin@metrocare.org", "AdminPassword123!", User.Role.HOSPITAL_ADMIN, "Marcus", "Vance"),
        ("dr_sharma", "dr.sharma@metrocare.org", "DoctorPassword123!", User.Role.DOCTOR, "Rajesh", "Sharma"),
        ("dr_smith", "dr.smith@metrocare.org", "DoctorPassword123!", User.Role.DOCTOR, "Emily", "Smith"),
        ("nurse_sarah", "nurse.sarah@metrocare.org", "NursePassword123!", User.Role.NURSE, "Sarah", "Connor"),
        ("reception_jane", "reception.jane@metrocare.org", "ReceptionPassword123!", User.Role.RECEPTIONIST, "Jane", "Miller"),
        ("pharm_alex", "pharm.alex@metrocare.org", "PharmaPassword123!", User.Role.PHARMACIST, "Alex", "Reed"),
        ("lab_david", "lab.david@metrocare.org", "LabtechPassword123!", User.Role.LAB_TECHNICIAN, "David", "Wright"),
        ("account_lisa", "account.lisa@metrocare.org", "AccountPassword123!", User.Role.ACCOUNTANT, "Lisa", "Davis"),
        ("patient_john", "john.doe@email.com", "PatientPassword123!", User.Role.PATIENT, "John", "Doe"),
        ("patient_maria", "maria.garcia@email.com", "PatientPassword123!", User.Role.PATIENT, "Maria", "Garcia"),
    ]

    users = {}
    for uname, email, pwd, role, fname, lname in users_data:
        user, created = User.objects.get_or_create(username=uname, defaults={
            "email": email,
            "role": role,
            "first_name": fname,
            "last_name": lname,
            "is_verified": True,
        })
        user.set_password(pwd)
        user.role = role
        user.first_name = fname
        user.last_name = lname
        user.email = email
        user.is_verified = True
        user.save()
        users[uname] = user
        status = "Created" if created else "Updated"
        print(f"[{status}] User: {uname} ({role})")

    # 2. Hospital & Departments
    hospital, _ = Hospital.objects.get_or_create(
        registration_number="REG-MCH-2026-01",
        defaults={
            "name": "MetroCare Central Hospital",
            "address": "742 Healthcare Parkway, Medical District",
            "city": "Metropolis",
            "state": "NY",
            "postal_code": "10001",
            "phone": "+1 (555) 234-5678",
            "email": "info@metrocare.org",
            "website": "https://metrocare.org",
            "is_active": True,
        }
    )
    print(f"Hospital: {hospital.name}")

    dept_gmed, _ = Department.objects.get_or_create(hospital=hospital, code="GMED", defaults={"name": "General Medicine", "location": "Building A, Floor 1"})
    dept_card, _ = Department.objects.get_or_create(hospital=hospital, code="CARD", defaults={"name": "Cardiology", "location": "Building B, Floor 3"})
    dept_ped, _ = Department.objects.get_or_create(hospital=hospital, code="PED", defaults={"name": "Pediatrics", "location": "Building A, Floor 2"})
    dept_orth, _ = Department.objects.get_or_create(hospital=hospital, code="ORTH", defaults={"name": "Orthopedics", "location": "Building C, Floor 1"})
    dept_emer, _ = Department.objects.get_or_create(hospital=hospital, code="EMER", defaults={"name": "Emergency & Trauma", "location": "Ground Floor"})

    # 3. Doctors
    doc_sharma, _ = Doctor.objects.get_or_create(
        user=users["dr_sharma"],
        defaults={
            "hospital": hospital,
            "department": dept_card,
            "doctor_id": "DOC-CARD-001",
            "specialization": "Interventional Cardiology",
            "license_number": "MD-LIC-87214",
            "qualification": "MD, FACC, Board Certified Cardiologist",
            "experience_years": 14,
            "consultation_fee": Decimal("85.00"),
            "bio": "Specialist in cardiovascular therapies and diagnostic angiography.",
            "is_available": True,
        }
    )
    doc_smith, _ = Doctor.objects.get_or_create(
        user=users["dr_smith"],
        defaults={
            "hospital": hospital,
            "department": dept_gmed,
            "doctor_id": "DOC-GMED-002",
            "specialization": "Internal Medicine",
            "license_number": "MD-LIC-94102",
            "qualification": "MD, Internal Medicine Specialist",
            "experience_years": 9,
            "consultation_fee": Decimal("65.00"),
            "bio": "Primary care physician dedicated to preventive and acute care.",
            "is_available": True,
        }
    )

    # 4. Staff Profiles
    Staff.objects.get_or_create(
        user=users["nurse_sarah"],
        defaults={
            "hospital": hospital,
            "department": dept_gmed,
            "employee_id": "EMP-NURSE-001",
            "designation": "Head Inpatient Nurse",
            "joining_date": date(2023, 1, 15),
            "is_active": True,
        }
    )
    Staff.objects.get_or_create(
        user=users["reception_jane"],
        defaults={
            "hospital": hospital,
            "department": dept_emer,
            "employee_id": "EMP-RECEPT-001",
            "designation": "Chief Patient Registrar",
            "joining_date": date(2023, 4, 1),
            "is_active": True,
        }
    )
    Staff.objects.get_or_create(
        user=users["pharm_alex"],
        defaults={
            "hospital": hospital,
            "department": dept_gmed,
            "employee_id": "EMP-PHARM-001",
            "designation": "Clinical Dispensing Pharmacist",
            "joining_date": date(2022, 8, 10),
            "is_active": True,
        }
    )
    Staff.objects.get_or_create(
        user=users["lab_david"],
        defaults={
            "hospital": hospital,
            "department": dept_emer,
            "employee_id": "EMP-LAB-001",
            "designation": "Diagnostic Laboratory Technologist",
            "joining_date": date(2023, 2, 20),
            "is_active": True,
        }
    )
    Staff.objects.get_or_create(
        user=users["account_lisa"],
        defaults={
            "hospital": hospital,
            "department": dept_emer,
            "employee_id": "EMP-ACCT-001",
            "designation": "Hospital Financial Accountant",
            "joining_date": date(2022, 11, 5),
            "is_active": True,
        }
    )

    # 5. Patients
    patient_john, _ = Patient.objects.get_or_create(
        user=users["patient_john"],
        defaults={
            "hospital": hospital,
            "date_of_birth": date(1985, 6, 15),
            "gender": Patient.Gender.MALE,
            "blood_group": Patient.BloodGroup.O_POSITIVE,
            "phone": "+1 (555) 301-9876",
            "address": "45 Elm Street, Apt 3B",
            "city": "Metropolis",
            "state": "NY",
            "postal_code": "10002",
            "emergency_contact_name": "Clara Doe",
            "emergency_contact_phone": "+1 (555) 301-9877",
            "emergency_contact_relationship": "Spouse",
            "medical_history": "Mild seasonal asthma",
            "allergies": "Penicillin",
        }
    )
    patient_maria, _ = Patient.objects.get_or_create(
        user=users["patient_maria"],
        defaults={
            "hospital": hospital,
            "date_of_birth": date(1992, 11, 20),
            "gender": Patient.Gender.FEMALE,
            "blood_group": Patient.BloodGroup.A_POSITIVE,
            "phone": "+1 (555) 420-1122",
            "address": "128 Oak Avenue",
            "city": "Metropolis",
            "state": "NY",
            "postal_code": "10003",
            "emergency_contact_name": "Carlos Garcia",
            "emergency_contact_phone": "+1 (555) 420-1123",
            "emergency_contact_relationship": "Brother",
            "medical_history": "None",
            "allergies": "No known drug allergies",
        }
    )

    # 6. Wards, Rooms & Beds
    ward, _ = Ward.objects.get_or_create(
        hospital=hospital,
        code="W-GEN-01",
        defaults={
            "name": "General Inpatient Ward",
            "floor": "Floor 2",
            "gender_policy": Ward.GenderPolicy.ANY,
            "is_active": True,
        }
    )
    room_201, _ = Room.objects.get_or_create(
        ward=ward,
        room_number="201",
        defaults={"room_type": Room.RoomType.DOUBLE, "capacity": 2}
    )
    room_202, _ = Room.objects.get_or_create(
        ward=ward,
        room_number="202",
        defaults={"room_type": Room.RoomType.SINGLE, "capacity": 1}
    )
    bed_201a, _ = Bed.objects.get_or_create(room=room_201, bed_number="201-A", defaults={"status": Bed.Status.OCCUPIED})
    bed_201b, _ = Bed.objects.get_or_create(room=room_201, bed_number="201-B", defaults={"status": Bed.Status.AVAILABLE})
    bed_202a, _ = Bed.objects.get_or_create(room=room_202, bed_number="202-A", defaults={"status": Bed.Status.AVAILABLE})

    # Admission for Patient John
    if not Admission.objects.filter(patient=patient_john, status=Admission.Status.ADMITTED).exists():
        adm = Admission.objects.create(
            patient=patient_john,
            attending_doctor=doc_smith,
            hospital=hospital,
            department=dept_gmed,
            admission_reason="Acute respiratory distress observation",
            admission_type=Admission.AdmissionType.EMERGENCY,
            status=Admission.Status.ADMITTED,
        )
        BedAssignment.objects.create(
            admission=adm,
            bed=bed_201a,
            is_active=True,
            reason="Assigned semi-private bed near monitoring console.",
        )
        print("Created Inpatient Admission for John Doe in Bed 201-A")

    # 7. Pharmacy Medicines
    meds = [
        ("MED-AMX-500", "Amoxicillin", "Amoxil 500", "Amoxicillin Trihydrate", "500 mg", Medicine.DosageForm.CAPSULE),
        ("MED-PCM-650", "Paracetamol", "Dolo 650", "Acetaminophen", "650 mg", Medicine.DosageForm.TABLET),
        ("MED-ATV-020", "Atorvastatin", "Lipitor 20", "Atorvastatin Calcium", "20 mg", Medicine.DosageForm.TABLET),
        ("MED-MET-500", "Metformin", "Glucophage", "Metformin Hydrochloride", "500 mg", Medicine.DosageForm.TABLET),
        ("MED-SLB-100", "Salbutamol", "Ventolin Inhaler", "Albuterol Sulfate", "100 mcg", Medicine.DosageForm.INHALER),
    ]
    for mcode, generic, brand, ingred, strength, form in meds:
        Medicine.objects.get_or_create(
            code=mcode,
            defaults={
                "generic_name": generic,
                "brand_name": brand,
                "active_ingredients": ingred,
                "strength": strength,
                "dosage_form": form,
                "route_of_administration": "Oral" if form != Medicine.DosageForm.INHALER else "Inhalation",
                "manufacturer": "MetroCare Pharmaceuticals",
                "requires_prescription": True,
                "low_stock_threshold": 50,
            }
        )

    # 8. Laboratory Catalogue Tests
    lab_tests = [
        ("LAB-CBC-01", "Complete Blood Count (CBC)", LabTest.Category.HEMATOLOGY, "Whole Blood (EDTA)"),
        ("LAB-CMP-01", "Comprehensive Metabolic Panel (CMP)", LabTest.Category.BIOCHEMISTRY, "Serum (SST)"),
        ("LAB-LPD-01", "Lipid Profile Panel", LabTest.Category.BIOCHEMISTRY, "Serum (Fasting)"),
        ("LAB-TSH-01", "Thyroid Stimulating Hormone (TSH)", LabTest.Category.BIOCHEMISTRY, "Serum"),
        ("LAB-TRP-01", "Cardiac Troponin I", LabTest.Category.BIOCHEMISTRY, "Plasma (Heparin)"),
    ]
    for tcode, tname, tcat, spec in lab_tests:
        LabTest.objects.get_or_create(
            code=tcode,
            defaults={
                "name": tname,
                "category": tcat,
                "specimen_type": spec,
                "turnaround_time_hours": 4,
                "is_active": True,
            }
        )

    # 9. Today's Appointments
    today = date.today()
    if not Appointment.objects.filter(patient=patient_maria, appointment_date=today).exists():
        Appointment.objects.create(
            hospital=hospital,
            patient=patient_maria,
            doctor=doc_sharma,
            department=dept_card,
            appointment_date=today,
            start_time=time(10, 30),
            end_time=time(11, 0),
            reason_for_visit="Routine cardiovascular follow-up and blood pressure review",
            status=Appointment.Status.CONFIRMED,
        )
        print("Created appointment for Maria Garcia with Dr. Sharma")

    if not Appointment.objects.filter(patient=patient_john, appointment_date=today).exists():
        Appointment.objects.create(
            hospital=hospital,
            patient=patient_john,
            doctor=doc_smith,
            department=dept_gmed,
            appointment_date=today,
            start_time=time(14, 0),
            end_time=time(14, 30),
            reason_for_visit="General consultation and respiratory check",
            status=Appointment.Status.CONFIRMED,
        )
        print("Created appointment for John Doe with Dr. Smith")

    # 10. Financial Invoices
    if not Invoice.objects.filter(status=Invoice.Status.PAID).exists():
        inv1 = Invoice.objects.create(
            hospital=hospital,
            patient=patient_maria,
            status=Invoice.Status.PAID,
            invoice_date=today - timedelta(days=2),
            due_date=today + timedelta(days=28),
            currency="USD",
            subtotal=Decimal("120.00"),
            total_tax=Decimal("15.00"),
            total_discount=Decimal("0.00"),
            total_amount=Decimal("135.00"),
            paid_amount=Decimal("135.00"),
            balance_due=Decimal("0.00"),
        )
        InvoiceLineItem.objects.create(
            invoice=inv1,
            description="Specialist Cardiology Consultation",
            quantity=1,
            unit_price=Decimal("85.00"),
            subtotal=Decimal("85.00"),
            tax_rate=Decimal("10.00"),
            tax_amount=Decimal("8.50"),
            discount=Decimal("0.00"),
            total_amount=Decimal("93.50"),
        )
        Payment.objects.create(
            invoice=inv1,
            patient=patient_maria,
            amount=Decimal("135.00"),
            payment_method=Payment.PaymentMethod.CREDIT_CARD,
            status=Payment.Status.COMPLETED,
            payment_date=today - timedelta(days=2),
            transaction_reference="TXN-CC-89412",
        )
        print("Created Paid Invoice for Maria Garcia")

    if not Invoice.objects.filter(status=Invoice.Status.ISSUED).exists():
        Invoice.objects.create(
            hospital=hospital,
            patient=patient_john,
            status=Invoice.Status.ISSUED,
            invoice_date=today,
            due_date=today + timedelta(days=30),
            currency="USD",
            subtotal=Decimal("300.00"),
            total_tax=Decimal("20.00"),
            total_discount=Decimal("0.00"),
            total_amount=Decimal("320.00"),
            paid_amount=Decimal("0.00"),
            balance_due=Decimal("320.00"),
        )
        print("Created Issued Invoice for John Doe")

    print("\n[SUCCESS] Demo Seeding Successfully Completed!")

if __name__ == "__main__":
    seed()
