import datetime
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from hospitals.models import Department, Doctor, Hospital
from patients.models import Patient
from .models import (
    CriticalResultNotification,
    LabAuditLog,
    LabOrder,
    LabOrderItem,
    LabReferenceRange,
    LabResult,
    LabResultCorrection,
    LabResultParameter,
    LabSpecimen,
    LabTest,
    LabTestParameter,
)
from .services import (
    acknowledge_critical_notification,
    collect_specimen,
    correct_verified_result,
    enter_lab_result,
    evaluate_parameter_value,
    match_reference_range,
    receive_specimen,
    reject_specimen,
    verify_lab_result,
)

User = get_user_model()


class BaseLaboratoryTestCase(APITestCase):

    def setUp(self):
        # 1. Users
        self.super_admin = User.objects.create_superuser(
            username="lab_superadmin",
            email="superadmin@hospital.com",
            password="AdminPassword123",
            role="SUPER_ADMIN",
        )
        self.hospital_admin = User.objects.create_user(
            username="lab_hospadmin",
            email="hospadmin@hospital.com",
            password="AdminPassword123",
            role="HOSPITAL_ADMIN",
        )
        self.doctor_user = User.objects.create_user(
            username="dr_gregory_house",
            email="house@hospital.com",
            password="DoctorPassword123",
            role="DOCTOR",
            first_name="Gregory",
            last_name="House",
        )
        self.lab_tech_user = User.objects.create_user(
            username="tech_dexter",
            email="dexter@hospital.com",
            password="TechPassword123",
            role="LAB_TECHNICIAN",
            first_name="Dexter",
            last_name="Morgan",
        )
        self.nurse_user = User.objects.create_user(
            username="nurse_carla",
            email="carla@hospital.com",
            password="NursePassword123",
            role="NURSE",
            first_name="Carla",
            last_name="Espinosa",
        )
        self.patient_user = User.objects.create_user(
            username="patient_john",
            email="john.doe@patient.com",
            password="PatientPassword123",
            role="PATIENT",
            first_name="John",
            last_name="Doe",
        )
        self.other_patient_user = User.objects.create_user(
            username="patient_jane",
            email="jane.smith@patient.com",
            password="PatientPassword123",
            role="PATIENT",
            first_name="Jane",
            last_name="Smith",
        )
        self.receptionist_user = User.objects.create_user(
            username="receptionist_pam",
            email="pam@hospital.com",
            password="StaffPassword123",
            role="RECEPTIONIST",
        )

        # 2. Hospital Structure
        self.hospital = Hospital.objects.create(
            name="Princeton-Plainsboro Teaching Hospital",
            registration_number="REG-LAB-001",
            phone="1234567890",
            email="info@ppth.org",
            address="Princeton, NJ",
        )
        self.department = Department.objects.create(
            hospital=self.hospital,
            name="Diagnostics & Pathology",
            code="DIAG-01",
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            hospital=self.hospital,
            department=self.department,
            doctor_id="DOC-HOUSE-01",
            specialization="Diagnostic Medicine",
            license_number="LIC-MED-7788",
            qualification="MD",
            consultation_fee=Decimal("150.00"),
        )

        # 3. Patients
        self.patient = Patient.objects.create(
            user=self.patient_user,
            date_of_birth=datetime.date(1990, 5, 15),
            gender="MALE",
            blood_group="O+",
            address="123 Main St, Princeton",
            emergency_contact_name="Mary Doe",
            emergency_contact_phone="5550192",
            emergency_contact_relationship="Spouse",
        )
        self.other_patient = Patient.objects.create(
            user=self.other_patient_user,
            date_of_birth=datetime.date(1995, 8, 20),
            gender="FEMALE",
            blood_group="A+",
            address="456 Elm St, Princeton",
            emergency_contact_name="Bob Smith",
            emergency_contact_phone="5550193",
            emergency_contact_relationship="Parent",
        )

        # 4. Diagnostic Tests Catalogue
        self.cbc_test = LabTest.objects.create(
            code="LAB-CBC-001",
            name="Complete Blood Count (CBC)",
            category=LabTest.Category.HEMATOLOGY,
            specimen_type="Whole Blood (EDTA)",
            collection_instructions="Lavender top EDTA tube, minimum 2 mL volume.",
            turnaround_time_hours=4,
        )
        self.param_wbc = LabTestParameter.objects.create(
            test=self.cbc_test,
            code="WBC",
            name="White Blood Cell Count",
            data_type=LabTestParameter.DataType.NUMERIC,
            unit="10^3/uL",
            sort_order=1,
        )
        self.param_hgb = LabTestParameter.objects.create(
            test=self.cbc_test,
            code="HGB",
            name="Hemoglobin",
            data_type=LabTestParameter.DataType.NUMERIC,
            unit="g/dL",
            sort_order=2,
        )

        # Reference ranges for WBC (Male/Female adult: 4.5 - 11.0, Critical < 2.0 or > 30.0)
        self.ref_wbc = LabReferenceRange.objects.create(
            parameter=self.param_wbc,
            gender=LabReferenceRange.Gender.ANY,
            age_min_years=18,
            age_max_years=99,
            min_normal_value=Decimal("4.500"),
            max_normal_value=Decimal("11.000"),
            critical_low_value=Decimal("2.000"),
            critical_high_value=Decimal("30.000"),
        )
        # Reference ranges for HGB (Male: 13.5 - 17.5, Critical < 7.0 or > 20.0)
        self.ref_hgb_male = LabReferenceRange.objects.create(
            parameter=self.param_hgb,
            gender=LabReferenceRange.Gender.MALE,
            age_min_years=18,
            age_max_years=99,
            min_normal_value=Decimal("13.500"),
            max_normal_value=Decimal("17.500"),
            critical_low_value=Decimal("7.000"),
            critical_high_value=Decimal("20.000"),
        )

        # Qualitative COVID-19 / Infectious Antigen Test
        self.covid_test = LabTest.objects.create(
            code="LAB-COV-001",
            name="SARS-CoV-2 Rapid Antigen",
            category=LabTest.Category.MICROBIOLOGY,
            specimen_type="Nasopharyngeal Swab",
            turnaround_time_hours=1,
        )
        self.param_covid = LabTestParameter.objects.create(
            test=self.covid_test,
            code="COV_AG",
            name="SARS-CoV-2 Antigen Result",
            data_type=LabTestParameter.DataType.QUALITATIVE,
            sort_order=1,
        )
        self.ref_covid = LabReferenceRange.objects.create(
            parameter=self.param_covid,
            gender=LabReferenceRange.Gender.ANY,
            age_min_years=0,
            age_max_years=120,
            normal_text_value="Negative",
        )


class LaboratoryCatalogueAndRangeTests(BaseLaboratoryTestCase):

    def test_reference_range_evaluation_normal(self):
        # WBC = 7.5 (Normal)
        abnormality, is_crit, crit_flag, disp = evaluate_parameter_value(
            parameter=self.param_wbc,
            patient=self.patient,
            numeric_val=Decimal("7.500"),
        )
        self.assertEqual(abnormality, LabResultParameter.AbnormalityFlag.NORMAL)
        self.assertFalse(is_crit)
        self.assertEqual(crit_flag, LabResultParameter.CriticalFlag.NONE)

    def test_reference_range_evaluation_critical_high(self):
        # WBC = 35.0 (Critical High > 30.0)
        abnormality, is_crit, crit_flag, disp = evaluate_parameter_value(
            parameter=self.param_wbc,
            patient=self.patient,
            numeric_val=Decimal("35.000"),
        )
        self.assertEqual(abnormality, LabResultParameter.AbnormalityFlag.HIGH)
        self.assertTrue(is_crit)
        self.assertEqual(crit_flag, LabResultParameter.CriticalFlag.CRITICAL_HIGH)

    def test_reference_range_evaluation_qualitative_abnormal(self):
        # COVID Antigen = Positive (Normal is Negative)
        abnormality, is_crit, crit_flag, disp = evaluate_parameter_value(
            parameter=self.param_covid,
            patient=self.patient,
            text_val="Positive",
        )
        self.assertEqual(abnormality, LabResultParameter.AbnormalityFlag.ABNORMAL)

    def test_list_tests_catalogue_api(self):
        self.client.force_authenticate(user=self.doctor_user)
        url = reverse("lab-test-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data["results"]), 2)


class LaboratoryOrderAndSpecimenLifecycleTests(BaseLaboratoryTestCase):

    def test_create_order_auto_generates_specimens(self):
        self.client.force_authenticate(user=self.doctor_user)
        url = reverse("lab-order-list")
        payload = {
            "patient": self.patient.id,
            "ordering_doctor": self.doctor.id,
            "priority": "URGENT",
            "clinical_indication": "Unexplained persistent fever and leukocytosis",
            "test_ids": [self.cbc_test.id, self.covid_test.id],
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order_ref = response.data["order_reference"]
        self.assertTrue(order_ref.startswith("LAB-"))

        # Verify order items
        order = LabOrder.objects.get(order_reference=order_ref)
        self.assertEqual(order.items.count(), 2)

        # Verify specimens were automatically created per matrix
        # CBC is Whole Blood; Covid is Nasopharyngeal Swab -> 2 distinct specimens
        self.assertEqual(order.specimens.count(), 2)
        specimen_types = list(order.specimens.values_list("specimen_type", flat=True))
        self.assertIn("Whole Blood (EDTA)", specimen_types)
        self.assertIn("Nasopharyngeal Swab", specimen_types)

        # Verify audit log was recorded
        audit = LabAuditLog.objects.filter(resource_id=order_ref, action="CREATED").first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.user, self.doctor_user)

    def test_specimen_collection_and_receipt_flow(self):
        # Create order
        order = LabOrder.objects.create(
            patient=self.patient,
            ordering_doctor=self.doctor,
            hospital=self.hospital,
            department=self.department,
            ordered_by=self.doctor_user,
        )
        item = LabOrderItem.objects.create(order=order, test=self.cbc_test)
        specimen = LabSpecimen.objects.create(order=order, specimen_type=self.cbc_test.specimen_type)
        specimen.order_items.add(item)

        # Nurse collects specimen
        self.client.force_authenticate(user=self.nurse_user)
        collect_url = reverse("lab-specimen-collect", kwargs={"pk": specimen.id})
        res_collect = self.client.post(collect_url, {"collection_location": "Ward 4 Bed 2"}, format="json")
        self.assertEqual(res_collect.status_code, status.HTTP_200_OK)
        specimen.refresh_from_db()
        self.assertEqual(specimen.status, LabSpecimen.Status.COLLECTED)
        self.assertEqual(specimen.collection_location, "Ward 4 Bed 2")

        # Lab Tech receives specimen in lab
        self.client.force_authenticate(user=self.lab_tech_user)
        receive_url = reverse("lab-specimen-receive", kwargs={"pk": specimen.id})
        res_receive = self.client.post(receive_url)
        self.assertEqual(res_receive.status_code, status.HTTP_200_OK)
        specimen.refresh_from_db()
        self.assertEqual(specimen.status, LabSpecimen.Status.RECEIVED)

        # Linked order item is now in PROCESSING
        item.refresh_from_db()
        self.assertEqual(item.status, LabOrderItem.ItemStatus.PROCESSING)

    def test_specimen_rejection(self):
        order = LabOrder.objects.create(
            patient=self.patient,
            ordering_doctor=self.doctor,
            hospital=self.hospital,
            department=self.department,
            ordered_by=self.doctor_user,
        )
        specimen = LabSpecimen.objects.create(order=order, specimen_type="Whole Blood")
        collect_specimen(specimen, self.nurse_user)

        self.client.force_authenticate(user=self.lab_tech_user)
        reject_url = reverse("lab-specimen-reject", kwargs={"pk": specimen.id})
        res = self.client.post(reject_url, {"rejection_reason": "Severe hemolysis detected"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        specimen.refresh_from_db()
        self.assertEqual(specimen.status, LabSpecimen.Status.REJECTED)
        self.assertEqual(specimen.rejection_reason, "Severe hemolysis detected")

    def test_order_cancellation(self):
        order = LabOrder.objects.create(
            patient=self.patient,
            ordering_doctor=self.doctor,
            hospital=self.hospital,
            department=self.department,
            ordered_by=self.doctor_user,
        )
        item = LabOrderItem.objects.create(order=order, test=self.cbc_test)

        self.client.force_authenticate(user=self.doctor_user)
        cancel_url = reverse("lab-order-cancel", kwargs={"pk": order.id})
        res = self.client.post(cancel_url, {"reason": "Patient discharged prior to testing"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        item.refresh_from_db()
        self.assertEqual(order.status, LabOrder.Status.CANCELLED)
        self.assertEqual(item.status, LabOrderItem.ItemStatus.CANCELLED)


class LaboratoryResultEntryVerificationAndCorrectionTests(BaseLaboratoryTestCase):

    def setUp(self):
        super().setUp()
        self.order = LabOrder.objects.create(
            patient=self.patient,
            ordering_doctor=self.doctor,
            hospital=self.hospital,
            department=self.department,
            ordered_by=self.doctor_user,
        )
        self.item = LabOrderItem.objects.create(order=self.order, test=self.cbc_test)
        self.specimen = LabSpecimen.objects.create(order=self.order, specimen_type=self.cbc_test.specimen_type)
        self.specimen.order_items.add(self.item)
        collect_specimen(self.specimen, self.nurse_user)
        receive_specimen(self.specimen, self.lab_tech_user)

    def test_enter_and_verify_result_triggers_critical_alert(self):
        # 1. Tech enters results with critical high WBC = 35.0
        self.client.force_authenticate(user=self.lab_tech_user)
        enter_url = reverse("lab-result-enter-results")
        payload = {
            "order_item_id": self.item.id,
            "specimen_id": self.specimen.id,
            "parameter_values": [
                {"parameter_id": self.param_wbc.id, "numeric_value": 35.0},
                {"parameter_id": self.param_hgb.id, "numeric_value": 14.5},
            ],
            "overall_interpretation": "Severe leukocytosis noted on automated differential",
        }
        res_enter = self.client.post(enter_url, payload, format="json")
        self.assertEqual(res_enter.status_code, status.HTTP_200_OK)
        self.assertTrue(res_enter.data["is_critical"])
        result_id = res_enter.data["id"]

        # 2. Tech or Doctor verifies result
        verify_url = reverse("lab-result-verify", kwargs={"pk": result_id})
        res_verify = self.client.post(verify_url)
        self.assertEqual(res_verify.status_code, status.HTTP_200_OK)
        self.assertEqual(res_verify.data["status"], LabResult.Status.VERIFIED)

        # 3. CriticalResultNotification must be generated automatically
        notif = CriticalResultNotification.objects.filter(result_id=result_id).first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.status, CriticalResultNotification.Status.PENDING_ACKNOWLEDGEMENT)
        self.assertIn("White Blood Cell Count: 35", notif.critical_details)

        # 4. Doctor acknowledges the critical alert
        self.client.force_authenticate(user=self.doctor_user)
        ack_url = reverse("lab-critical-notification-acknowledge", kwargs={"pk": notif.id})
        res_ack = self.client.post(ack_url, {"notes": "Clinician notified immediately. Ordered oncology consult."}, format="json")
        self.assertEqual(res_ack.status_code, status.HTTP_200_OK)
        notif.refresh_from_db()
        self.assertEqual(notif.status, CriticalResultNotification.Status.ACKNOWLEDGED)
        self.assertEqual(notif.acknowledged_by, self.doctor_user)

    def test_audited_result_correction_workflow(self):
        # 1. Enter and verify standard result
        result = enter_lab_result(
            order_item=self.item,
            specimen=self.specimen,
            parameter_values_data=[
                {"parameter": self.param_wbc, "numeric_value": Decimal("8.000")},
                {"parameter": self.param_hgb, "numeric_value": Decimal("14.000")},
            ],
            user=self.lab_tech_user,
        )
        verify_lab_result(result, self.lab_tech_user)

        # 2. Correct verified result with formal audit reason
        self.client.force_authenticate(user=self.lab_tech_user)
        correct_url = reverse("lab-result-correct", kwargs={"pk": result.id})
        payload = {
            "corrections": [
                {"parameter_id": self.param_hgb.id, "new_numeric_value": 15.2},
            ],
            "correction_reason": "Sample re-run after analyzer recalibration demonstrated 15.2 g/dL",
        }
        res_correct = self.client.post(correct_url, payload, format="json")
        self.assertEqual(res_correct.status_code, status.HTTP_200_OK)
        self.assertEqual(res_correct.data["status"], LabResult.Status.CORRECTED)

        # Verify correction record
        correction = LabResultCorrection.objects.filter(result=result).first()
        self.assertIsNotNone(correction)
        self.assertEqual(correction.previous_numeric_value, Decimal("14.000"))
        self.assertEqual(correction.new_numeric_value, Decimal("15.200"))
        self.assertEqual(correction.corrected_by, self.lab_tech_user)


class LaboratoryRBACTestCase(BaseLaboratoryTestCase):

    def setUp(self):
        super().setUp()
        self.order = LabOrder.objects.create(
            patient=self.patient,
            ordering_doctor=self.doctor,
            hospital=self.hospital,
            department=self.department,
            ordered_by=self.doctor_user,
        )
        self.item = LabOrderItem.objects.create(order=self.order, test=self.cbc_test)
        self.specimen = LabSpecimen.objects.create(order=self.order, specimen_type=self.cbc_test.specimen_type)
        self.specimen.order_items.add(self.item)

    def test_patient_can_view_only_own_verified_results(self):
        # Result in ENTERED (draft/unverified)
        result = enter_lab_result(
            order_item=self.item,
            specimen=self.specimen,
            parameter_values_data=[{"parameter": self.param_wbc, "numeric_value": Decimal("6.000")}],
            user=self.lab_tech_user,
        )

        # Patient cannot view unverified draft results
        self.client.force_authenticate(user=self.patient_user)
        detail_url = reverse("lab-result-detail", kwargs={"pk": result.id})
        res = self.client.get(detail_url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Verify result
        verify_lab_result(result, self.lab_tech_user)

        # Now patient can view their own released result
        res_released = self.client.get(detail_url)
        self.assertEqual(res_released.status_code, status.HTTP_200_OK)

        # Other patient cannot view this result
        self.client.force_authenticate(user=self.other_patient_user)
        res_other = self.client.get(detail_url)
        self.assertEqual(res_other.status_code, status.HTTP_404_NOT_FOUND)

    def test_patient_results_endpoint_me(self):
        result = enter_lab_result(
            order_item=self.item,
            specimen=self.specimen,
            parameter_values_data=[{"parameter": self.param_wbc, "numeric_value": Decimal("6.000")}],
            user=self.lab_tech_user,
        )
        verify_lab_result(result, self.lab_tech_user)

        self.client.force_authenticate(user=self.patient_user)
        url = reverse("patient-my-lab-results")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_receptionist_cannot_create_order(self):
        self.client.force_authenticate(user=self.receptionist_user)
        url = reverse("lab-order-list")
        payload = {
            "patient": self.patient.id,
            "ordering_doctor": self.doctor.id,
            "test_ids": [self.cbc_test.id],
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_audit_log_immutability(self):
        log = LabAuditLog.objects.create(
            resource_type="TEST",
            resource_id="1",
            action="VERIFIED",
            user=self.doctor_user,
            description="Testing log immutability",
        )
        with self.assertRaises(ValidationError):
            log.description = "Altered description"
            log.clean()

        with self.assertRaises(ValidationError):
            log.delete()

