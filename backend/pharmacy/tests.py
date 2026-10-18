import datetime
import decimal
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from hospitals.models import Department, Doctor, Hospital
from patients.models import Patient
from pharmacy.models import (
    DispenseRecord,
    Medicine,
    MedicineBatch,
    PharmacyLocation,
    Prescription,
    PrescriptionItem,
    StockMovement,
)
from pharmacy.services import (
    adjust_stock_batch,
    cancel_prescription,
    check_allergy_conflict,
    dispense_prescription,
    issue_prescription,
    mark_expired_batches,
    receive_stock_batch,
    reverse_dispense_record,
)


User = get_user_model()


class BasePharmacyTestCase(APITestCase):

    def setUp(self):
        # 1. Users
        self.admin_user = User.objects.create_user(
            username="pharm_admin",
            email="admin@hospital.com",
            password="AdminPassword123",
            role="HOSPITAL_ADMIN",
            first_name="Hospital",
            last_name="Admin",
        )
        self.doctor_user = User.objects.create_user(
            username="dr_meredith",
            email="meredith@hospital.com",
            password="DoctorPassword123",
            role="DOCTOR",
            first_name="Meredith",
            last_name="Grey",
        )
        self.pharmacist_user = User.objects.create_user(
            username="pharm_walter",
            email="walter@hospital.com",
            password="PharmPassword123",
            role="PHARMACIST",
            first_name="Walter",
            last_name="White",
        )
        self.nurse_user = User.objects.create_user(
            username="nurse_carla",
            email="carla@hospital.com",
            password="NursePassword123",
            role="NURSE",
            first_name="Carla",
            last_name="Espinosa",
        )
        self.accountant_user = User.objects.create_user(
            username="accountant_norm",
            email="norm@hospital.com",
            password="AccountantPassword123",
            role="ACCOUNTANT",
            first_name="Norm",
            last_name="Accountant",
        )
        self.patient_user1 = User.objects.create_user(
            username="patient_peter",
            email="peter@patient.com",
            password="PatientPassword123",
            role="PATIENT",
            first_name="Peter",
            last_name="Parker",
        )
        self.patient_user2 = User.objects.create_user(
            username="patient_bruce",
            email="bruce@patient.com",
            password="PatientPassword123",
            role="PATIENT",
            first_name="Bruce",
            last_name="Wayne",
        )

        # 2. Hospital & Department
        self.hospital = Hospital.objects.create(
            name="Grace Hospital",
            registration_number="HOSP-RX-001",
            address="100 Seattle Way",
            city="Seattle",
            state="WA",
            postal_code="98101",
            phone="9876543210",
            email="info@grace.com",
            is_active=True,
        )
        self.department = Department.objects.create(
            hospital=self.hospital,
            name="General Internal Medicine",
            code="GIM",
            is_active=True,
        )

        # 3. Doctor
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            hospital=self.hospital,
            department=self.department,
            doctor_id="DOC-GIM-001",
            specialization="Internal Medicine",
            license_number="LIC-PHARM-001",
            qualification="MD",
            experience_years=12,
            consultation_fee=150.00,
            is_available=True,
        )

        # 4. Patients
        self.patient1 = Patient.objects.create(
            user=self.patient_user1,
            hospital=self.hospital,
            date_of_birth="1995-08-10",
            gender="MALE",
            blood_group="O+",
            phone="9876543211",
            address="Queens, NY",
            allergies="Penicillin, Sulfa drugs",
            emergency_contact_name="May Parker",
            emergency_contact_relationship="Aunt",
            emergency_contact_phone="9876543212",
        )
        self.patient2 = Patient.objects.create(
            user=self.patient_user2,
            hospital=self.hospital,
            date_of_birth="1982-02-19",
            gender="MALE",
            blood_group="AB+",
            phone="9876543213",
            address="Gotham City",
            allergies="None known",
            emergency_contact_name="Alfred Pennyworth",
            emergency_contact_relationship="Guardian",
            emergency_contact_phone="9876543214",
        )

        # 5. Pharmacy Location
        self.location = PharmacyLocation.objects.create(
            hospital=self.hospital,
            location_code="PHARM-MAIN",
            name="Main Inpatient & Outpatient Pharmacy",
        )

        # 6. Medicines
        self.amoxicillin = Medicine.objects.create(
            code="MED-AMOX-500",
            generic_name="Amoxicillin",
            brand_name="Amoxil",
            active_ingredients="Amoxicillin Trihydrate (Penicillin class)",
            strength="500 mg",
            dosage_form=Medicine.DosageForm.CAPSULE,
            dispensing_unit="capsule",
            manufacturer="GlaxoSmithKline",
            low_stock_threshold=20,
        )
        self.paracetamol = Medicine.objects.create(
            code="MED-PARA-500",
            generic_name="Paracetamol",
            brand_name="Panadol",
            active_ingredients="Acetaminophen",
            strength="500 mg",
            dosage_form=Medicine.DosageForm.TABLET,
            dispensing_unit="tablet",
            manufacturer="Haleon",
            low_stock_threshold=30,
        )

        # 7. Inventory Batches
        future_date = (timezone.now() + datetime.timedelta(days=180)).date()
        self.para_batch = MedicineBatch.objects.create(
            medicine=self.paracetamol,
            pharmacy_location=self.location,
            batch_number="BAT-PARA-001",
            expiry_date=future_date,
            purchase_cost=decimal.Decimal("0.10"),
            selling_price=decimal.Decimal("0.25"),
            received_quantity=100,
            available_quantity=100,
            batch_status=MedicineBatch.BatchStatus.ACTIVE,
        )
        self.amox_batch = MedicineBatch.objects.create(
            medicine=self.amoxicillin,
            pharmacy_location=self.location,
            batch_number="BAT-AMOX-001",
            expiry_date=future_date,
            purchase_cost=decimal.Decimal("0.50"),
            selling_price=decimal.Decimal("1.20"),
            received_quantity=50,
            available_quantity=50,
            batch_status=MedicineBatch.BatchStatus.ACTIVE,
        )


class MedicineCatalogueTests(BasePharmacyTestCase):

    def test_medicine_creation_and_unique_code(self):
        med = Medicine.objects.create(
            code="MED-IBU-400",
            generic_name="Ibuprofen",
            brand_name="Advil",
            active_ingredients="Ibuprofen",
            strength="400 mg",
            dosage_form=Medicine.DosageForm.TABLET,
            manufacturer="Pfizer",
        )
        self.assertEqual(med.dispensing_unit, "tablet")
        self.assertTrue(med.is_active)

        # Duplicate code rejected
        duplicate = Medicine(
            code="MED-IBU-400",
            generic_name="Ibuprofen Generic",
            brand_name="Motrin",
            active_ingredients="Ibuprofen",
            strength="400 mg",
            manufacturer="McNeil",
        )
        with self.assertRaises(IntegrityError):
            duplicate.save()

    def test_pharmacist_can_create_medicine_via_api(self):
        self.client.force_authenticate(user=self.pharmacist_user)
        url = reverse("medicine-list")
        payload = {
            "code": "MED-CIPRO-500",
            "generic_name": "Ciprofloxacin",
            "brand_name": "Cipro",
            "active_ingredients": "Ciprofloxacin HCl",
            "strength": "500 mg",
            "dosage_form": "TABLET",
            "manufacturer": "Bayer",
            "dispensing_unit": "tablet",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["code"], "MED-CIPRO-500")

    def test_patient_cannot_create_medicine(self):
        self.client.force_authenticate(user=self.patient_user1)
        url = reverse("medicine-list")
        payload = {
            "code": "MED-FAKE-001",
            "generic_name": "Fake",
            "brand_name": "Fake",
            "active_ingredients": "None",
            "strength": "10 mg",
            "manufacturer": "Unknown",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class InventoryAndMovementTests(BasePharmacyTestCase):

    def test_stock_receipt_service_creates_batch_and_movement(self):
        future_date = (timezone.now() + datetime.timedelta(days=365)).date()
        batch = receive_stock_batch(
            medicine=self.paracetamol,
            pharmacy_location=self.location,
            batch_number="BAT-PARA-002",
            expiry_date=future_date,
            quantity=200,
            purchase_cost=decimal.Decimal("0.08"),
            selling_price=decimal.Decimal("0.20"),
            user=self.pharmacist_user,
            supplier="PharmaDist Ltd",
        )
        self.assertEqual(batch.available_quantity, 200)

        # Check movement history
        movement = StockMovement.objects.filter(batch=batch, movement_type="RECEIPT").first()
        self.assertIsNotNone(movement)
        self.assertEqual(movement.quantity, 200)
        self.assertEqual(movement.resulting_balance, 200)
        self.assertEqual(movement.acting_user, self.pharmacist_user)

    def test_receive_expired_batch_rejected(self):
        past_date = (timezone.now() - datetime.timedelta(days=10)).date()
        with self.assertRaises(ValidationError) as ctx:
            receive_stock_batch(
                medicine=self.paracetamol,
                pharmacy_location=self.location,
                batch_number="BAT-EXPIRED-001",
                expiry_date=past_date,
                quantity=50,
                purchase_cost=decimal.Decimal("0.10"),
                selling_price=decimal.Decimal("0.25"),
                user=self.pharmacist_user,
            )
        self.assertIn("expiry_date", ctx.exception.message_dict)

    def test_stock_adjustment_decreases_stock_and_logs(self):
        adjust_stock_batch(
            batch=self.para_batch,
            adjustment_type="DECREASE",
            quantity=20,
            user=self.pharmacist_user,
            reason="Water damage during storage",
        )
        self.para_batch.refresh_from_db()
        self.assertEqual(self.para_batch.available_quantity, 80)

        movement = StockMovement.objects.filter(batch=self.para_batch, movement_type="ADJUSTMENT").first()
        self.assertIsNotNone(movement)
        self.assertEqual(movement.quantity, -20)
        self.assertEqual(movement.resulting_balance, 80)

    def test_stock_cannot_become_negative(self):
        with self.assertRaises(ValidationError):
            adjust_stock_batch(
                batch=self.para_batch,
                adjustment_type="DECREASE",
                quantity=150,  # Only 100 available
                user=self.pharmacist_user,
                reason="Over-deduction attempt",
            )

    def test_mark_expired_batches_service(self):
        # Create an expired batch with remaining stock
        past_date = (timezone.now() - datetime.timedelta(days=5)).date()
        expired_batch = MedicineBatch.objects.create(
            medicine=self.paracetamol,
            pharmacy_location=self.location,
            batch_number="BAT-EXPIRED-TEST",
            expiry_date=past_date,
            received_quantity=30,
            available_quantity=30,
            batch_status=MedicineBatch.BatchStatus.ACTIVE,
        )
        count = mark_expired_batches(acting_user=self.pharmacist_user)
        self.assertTrue(count >= 1)
        expired_batch.refresh_from_db()
        self.assertEqual(expired_batch.available_quantity, 0)
        self.assertEqual(expired_batch.batch_status, MedicineBatch.BatchStatus.EXPIRED)

    def test_stock_movements_are_immutable(self):
        movement = StockMovement.objects.create(
            batch=self.para_batch,
            pharmacy_location=self.location,
            movement_type=StockMovement.MovementType.RECEIPT,
            quantity=10,
            previous_balance=0,
            resulting_balance=10,
            reason="Test movement",
        )
        movement.reason = "Tampered"
        with self.assertRaises(ValidationError):
            movement.clean()

        with self.assertRaises(ValidationError):
            movement.delete()


class PrescriptionAndAllergyTests(BasePharmacyTestCase):

    def test_allergy_conflict_detected_and_blocks_unauthorized_issue(self):
        # Patient 1 has allergy: "Penicillin"
        # Amoxicillin contains Penicillin
        has_conflict, msg = check_allergy_conflict(self.patient1, self.amoxicillin)
        self.assertTrue(has_conflict)
        self.assertIn("Penicillin", msg)

        # Create prescription in DRAFT
        rx = Prescription.objects.create(
            patient=self.patient1,
            doctor=self.doctor,
            hospital=self.hospital,
            clinical_indication="Strep throat",
        )
        item = PrescriptionItem.objects.create(
            prescription=rx,
            medicine=self.amoxicillin,
            dosage_instructions="500 mg TID",
            frequency="Three times daily",
            quantity_prescribed=21,
            allergy_override=False,  # No override
        )

        # Attempt to issue prescription without override raises ValidationError
        with self.assertRaises(ValidationError) as ctx:
            issue_prescription(prescription=rx, user=self.doctor_user)
        self.assertIn("items", ctx.exception.message_dict)

        # Now document override
        item.allergy_override = True
        item.allergy_override_reason = "Alternative antibiotics contraindicated, desensitization protocol active."
        item.save()

        # Issuing now succeeds
        issued_rx = issue_prescription(prescription=rx, user=self.doctor_user)
        self.assertEqual(issued_rx.status, Prescription.Status.ISSUED)
        self.assertEqual(issued_rx.issued_by, self.doctor_user)

    def test_prescription_cancel_workflow(self):
        rx = Prescription.objects.create(
            patient=self.patient2,
            doctor=self.doctor,
            hospital=self.hospital,
            clinical_indication="Headache",
            status=Prescription.Status.DRAFT,
        )
        PrescriptionItem.objects.create(
            prescription=rx,
            medicine=self.paracetamol,
            dosage_instructions="1000 mg PRN",
            frequency="Every 6 hours",
            quantity_prescribed=20,
        )
        cancelled = cancel_prescription(
            prescription=rx,
            user=self.doctor_user,
            cancellation_reason="Symptoms resolved spontaneously",
        )
        self.assertEqual(cancelled.status, Prescription.Status.CANCELLED)
        self.assertEqual(cancelled.cancelled_by, self.doctor_user)

    def test_doctor_creates_prescription_via_api(self):
        self.client.force_authenticate(user=self.doctor_user)
        url = reverse("prescription-list")
        payload = {
            "patient": self.patient2.id,
            "clinical_indication": "Tension headache",
            "general_instructions": "Take after meals",
            "items": [
                {
                    "medicine": self.paracetamol.id,
                    "dosage_instructions": "500 mg",
                    "frequency": "Twice daily",
                    "duration_value": 5,
                    "duration_unit": "DAYS",
                    "quantity_prescribed": 10,
                }
            ],
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "DRAFT")
        self.assertEqual(len(response.data["items"]), 1)


class DispensingWorkflowAndSafetyTests(BasePharmacyTestCase):

    def setUp(self):
        super().setUp()
        self.prescription = Prescription.objects.create(
            patient=self.patient2,
            doctor=self.doctor,
            hospital=self.hospital,
            status=Prescription.Status.ISSUED,
            issued_by=self.doctor_user,
            issued_at=timezone.now(),
        )
        self.rx_item = PrescriptionItem.objects.create(
            prescription=self.prescription,
            medicine=self.paracetamol,
            dosage_instructions="500 mg",
            frequency="TID",
            quantity_prescribed=30,
            quantity_dispensed=0,
            status=PrescriptionItem.ItemStatus.PENDING,
        )

    def test_partial_and_completed_dispense_workflow(self):
        # 1. First partial dispense: 10 units
        dispense1 = dispense_prescription(
            prescription=self.prescription,
            pharmacy_location=self.location,
            items_data=[
                {
                    "prescription_item_id": self.rx_item.id,
                    "batch_id": self.para_batch.id,
                    "quantity": 10,
                }
            ],
            user=self.pharmacist_user,
            notes="Initial 3-day supply",
        )
        self.assertEqual(dispense1.items.count(), 1)
        self.prescription.refresh_from_db()
        self.assertEqual(self.prescription.status, Prescription.Status.PARTIALLY_DISPENSED)
        self.rx_item.refresh_from_db()
        self.assertEqual(self.rx_item.quantity_dispensed, 10)
        self.assertEqual(self.rx_item.remaining_quantity, 20)

        self.para_batch.refresh_from_db()
        self.assertEqual(self.para_batch.available_quantity, 90)

        # 2. Second dispense completing remainder: 20 units
        dispense2 = dispense_prescription(
            prescription=self.prescription,
            pharmacy_location=self.location,
            items_data=[
                {
                    "prescription_item_id": self.rx_item.id,
                    "batch_id": self.para_batch.id,
                    "quantity": 20,
                }
            ],
            user=self.pharmacist_user,
            notes="Remaining 7-day supply",
        )
        self.prescription.refresh_from_db()
        self.assertEqual(self.prescription.status, Prescription.Status.DISPENSED)
        self.rx_item.refresh_from_db()
        self.assertEqual(self.rx_item.quantity_dispensed, 30)
        self.assertEqual(self.rx_item.remaining_quantity, 0)
        self.assertEqual(self.rx_item.status, PrescriptionItem.ItemStatus.DISPENSED)

        self.para_batch.refresh_from_db()
        self.assertEqual(self.para_batch.available_quantity, 70)

    def test_prevent_over_dispensing(self):
        with self.assertRaises(ValidationError) as ctx:
            dispense_prescription(
                prescription=self.prescription,
                pharmacy_location=self.location,
                items_data=[
                    {
                        "prescription_item_id": self.rx_item.id,
                        "batch_id": self.para_batch.id,
                        "quantity": 50,  # Prescribed only 30
                    }
                ],
                user=self.pharmacist_user,
            )
        self.assertIn("items", ctx.exception.message_dict)

    def test_prevent_dispensing_expired_batch(self):
        past_date = (timezone.now() - datetime.timedelta(days=2)).date()
        expired_batch = MedicineBatch.objects.create(
            medicine=self.paracetamol,
            pharmacy_location=self.location,
            batch_number="BAT-EXPIRED-DISP",
            expiry_date=past_date,
            received_quantity=100,
            available_quantity=100,
            batch_status=MedicineBatch.BatchStatus.EXPIRED,
        )
        with self.assertRaises(ValidationError) as ctx:
            dispense_prescription(
                prescription=self.prescription,
                pharmacy_location=self.location,
                items_data=[
                    {
                        "prescription_item_id": self.rx_item.id,
                        "batch_id": expired_batch.id,
                        "quantity": 10,
                    }
                ],
                user=self.pharmacist_user,
            )
        self.assertIn("items", ctx.exception.message_dict)

    def test_prevent_mismatched_batch_and_medicine(self):
        # Attempt to dispense Amoxicillin batch for Paracetamol prescription item
        with self.assertRaises(ValidationError) as ctx:
            dispense_prescription(
                prescription=self.prescription,
                pharmacy_location=self.location,
                items_data=[
                    {
                        "prescription_item_id": self.rx_item.id,
                        "batch_id": self.amox_batch.id,  # Wrong medicine
                        "quantity": 10,
                    }
                ],
                user=self.pharmacist_user,
            )
        self.assertIn("items", ctx.exception.message_dict)

    def test_reverse_dispense_record_restores_stock(self):
        dispense = dispense_prescription(
            prescription=self.prescription,
            pharmacy_location=self.location,
            items_data=[
                {
                    "prescription_item_id": self.rx_item.id,
                    "batch_id": self.para_batch.id,
                    "quantity": 15,
                }
            ],
            user=self.pharmacist_user,
        )
        self.para_batch.refresh_from_db()
        self.assertEqual(self.para_batch.available_quantity, 85)

        # Reverse dispense
        reversed_rec = reverse_dispense_record(
            dispense_record=dispense,
            user=self.pharmacist_user,
            reason="Dispensed wrong formulation by mistake",
            return_to_stock=True,
        )
        self.assertTrue(reversed_rec.is_reversed)
        self.para_batch.refresh_from_db()
        self.assertEqual(self.para_batch.available_quantity, 100)
        self.rx_item.refresh_from_db()
        self.assertEqual(self.rx_item.quantity_dispensed, 0)
        self.prescription.refresh_from_db()
        self.assertEqual(self.prescription.status, Prescription.Status.ISSUED)


class RoleBasedAccessTests(BasePharmacyTestCase):

    def setUp(self):
        super().setUp()
        self.prescription = Prescription.objects.create(
            patient=self.patient1,
            doctor=self.doctor,
            hospital=self.hospital,
            status=Prescription.Status.ISSUED,
            issued_by=self.doctor_user,
            issued_at=timezone.now(),
        )

    def test_patient_can_view_own_prescriptions_only(self):
        other_rx = Prescription.objects.create(
            patient=self.patient2,
            doctor=self.doctor,
            hospital=self.hospital,
            status=Prescription.Status.ISSUED,
        )
        self.client.force_authenticate(user=self.patient_user1)
        url = reverse("prescription-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rx_ids = [p["id"] for p in response.data.get("results", response.data)]
        self.assertIn(self.prescription.id, rx_ids)
        self.assertNotIn(other_rx.id, rx_ids)

    def test_patient_cannot_view_inventory_batches(self):
        self.client.force_authenticate(user=self.patient_user1)
        url = reverse("batch-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_doctor_cannot_dispense_medicines(self):
        self.client.force_authenticate(user=self.doctor_user)
        url = reverse("dispense-list")
        payload = {
            "prescription": self.prescription.id,
            "pharmacy_location": self.location.id,
            "items": [],
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthorized_staff_denied_access(self):
        self.client.force_authenticate(user=self.accountant_user)
        resp_rx = self.client.get(reverse("prescription-list"))
        self.assertEqual(resp_rx.status_code, status.HTTP_403_FORBIDDEN)

        resp_disp = self.client.get(reverse("dispense-list"))
        self.assertEqual(resp_disp.status_code, status.HTTP_403_FORBIDDEN)
