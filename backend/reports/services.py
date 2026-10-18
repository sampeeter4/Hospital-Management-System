from datetime import datetime, timedelta
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Count, F, Q, Sum
from django.utils import timezone

from .models import ReportAuditLog


def parse_date_range(start_date_str, end_date_str):
    """
    Parses and validates ISO date range strings (YYYY-MM-DD).
    Returns (start_date, end_date) as date objects.
    """
    start_date = None
    end_date = None

    if start_date_str:
        try:
            start_date = datetime.strptime(str(start_date_str).strip(), "%Y-%m-%d").date()
        except ValueError:
            raise ValidationError({"start_date": "Invalid date format. Expected YYYY-MM-DD."})

    if end_date_str:
        try:
            end_date = datetime.strptime(str(end_date_str).strip(), "%Y-%m-%d").date()
        except ValueError:
            raise ValidationError({"end_date": "Invalid date format. Expected YYYY-MM-DD."})

    if start_date and end_date and start_date > end_date:
        raise ValidationError({"start_date": "Start date cannot be after end date."})

    return start_date, end_date


def record_report_audit(user, report_type, action, hospital=None, parameters=None, ip_address=None, records_count=0):
    """
    Records an immutable audit trail entry for viewing or exporting sensitive hospital reports.
    """
    try:
        ReportAuditLog.objects.create(
            user=user if user and user.is_authenticated else None,
            report_type=report_type,
            action=action,
            hospital=hospital,
            parameters=parameters or {},
            ip_address=ip_address,
            records_count=records_count,
        )
    except Exception:
        pass


def get_dashboard_metrics(user, hospital=None, start_date=None, end_date=None):
    """
    Builds role-customized dashboard metrics using optimized database aggregates.
    """
    role = getattr(user, "role", None)
    now = timezone.now()
    today = now.date()

    # Scope resolution: if user has a hospital profile, use it unless SUPER_ADMIN queries another
    user_hospital = hospital
    if not user_hospital and hasattr(user, "doctor_profile") and user.doctor_profile.hospital:
        user_hospital = user.doctor_profile.hospital
    elif not user_hospital and hasattr(user, "staff_profile") and user.staff_profile.hospital:
        user_hospital = user.staff_profile.hospital

    # Base payload
    metrics = {
        "user_role": role,
        "hospital_id": user_hospital.id if user_hospital else None,
        "hospital_name": user_hospital.name if user_hospital else "All Hospitals",
        "timestamp": now.isoformat(),
        "start_date": str(start_date) if start_date else None,
        "end_date": str(end_date) if end_date else None,
    }

    # 1. DOCTOR DASHBOARD
    if role == "DOCTOR":
        from appointments.models import Appointment
        from inpatient.models import Admission
        from medical_records.models import ClinicalEncounter

        doc_profile = getattr(user, "doctor_profile", None)
        if not doc_profile:
            return {**metrics, "message": "Doctor profile not configured."}

        apt_qs = Appointment.objects.filter(doctor=doc_profile)
        if start_date:
            apt_qs = apt_qs.filter(appointment_date__gte=start_date)
        if end_date:
            apt_qs = apt_qs.filter(appointment_date__lte=end_date)

        metrics["workload"] = {
            "today_appointments_count": Appointment.objects.filter(doctor=doc_profile, appointment_date=today).count(),
            "upcoming_appointments_count": Appointment.objects.filter(
                doctor=doc_profile,
                appointment_date__gte=today,
                status__in=[Appointment.Status.CONFIRMED, Appointment.Status.PENDING],
            ).count(),
            "completed_appointments_count": apt_qs.filter(status=Appointment.Status.COMPLETED).count(),
            "cancelled_appointments_count": apt_qs.filter(status=Appointment.Status.CANCELLED).count(),
            "assigned_active_inpatients_count": Admission.objects.filter(
                attending_doctor=doc_profile,
                status=Admission.Status.ADMITTED,
            ).count(),
            "encounters_recorded_count": ClinicalEncounter.objects.filter(
                doctor=doc_profile,
                created_at__date__gte=start_date if start_date else today - timedelta(days=30),
            ).count(),
        }
        return metrics

    # 2. NURSE DASHBOARD
    if role == "NURSE":
        from inpatient.models import Admission, Bed, Ward

        inpatient_hosp_qs = Admission.objects.all()
        ward_qs = Ward.objects.filter(is_active=True)
        bed_qs = Bed.objects.all()

        if user_hospital:
            inpatient_hosp_qs = inpatient_hosp_qs.filter(hospital=user_hospital)
            ward_qs = ward_qs.filter(hospital=user_hospital)
            bed_qs = bed_qs.filter(room__ward__hospital=user_hospital)

        total_beds = bed_qs.count()
        occupied_beds = bed_qs.filter(status=Bed.Status.OCCUPIED).count()
        available_beds = bed_qs.filter(status=Bed.Status.AVAILABLE).count()
        occupancy_rate = round((occupied_beds / total_beds * 100), 1) if total_beds > 0 else 0.0

        metrics["inpatient_overview"] = {
            "total_beds": total_beds,
            "occupied_beds": occupied_beds,
            "available_beds": available_beds,
            "occupancy_rate_percent": occupancy_rate,
            "active_inpatients_count": inpatient_hosp_qs.filter(status=Admission.Status.ADMITTED).count(),
            "admissions_today_count": inpatient_hosp_qs.filter(admission_date__date=today).count(),
        }
        return metrics

    # 3. ACCOUNTANT DASHBOARD
    if role == "ACCOUNTANT":
        from billing.models import CreditNote, InsuranceClaim, Invoice, Payment, Refund

        inv_qs = Invoice.objects.exclude(status=Invoice.Status.VOID)
        pay_qs = Payment.objects.filter(status=Payment.Status.COMPLETED)
        ref_qs = Refund.objects.filter(status=Refund.Status.EXECUTED)
        clm_qs = InsuranceClaim.objects.exclude(status=InsuranceClaim.Status.CANCELLED)

        if user_hospital:
            inv_qs = inv_qs.filter(hospital=user_hospital)
            pay_qs = pay_qs.filter(hospital=user_hospital)
            ref_qs = ref_qs.filter(payment__hospital=user_hospital)
            clm_qs = clm_qs.filter(hospital=user_hospital)

        if start_date:
            inv_qs = inv_qs.filter(invoice_date__gte=start_date)
            pay_qs = pay_qs.filter(payment_date__date__gte=start_date)
            ref_qs = ref_qs.filter(executed_at__date__gte=start_date)
            clm_qs = clm_qs.filter(created_at__date__gte=start_date)
        if end_date:
            inv_qs = inv_qs.filter(invoice_date__lte=end_date)
            pay_qs = pay_qs.filter(payment_date__date__lte=end_date)
            ref_qs = ref_qs.filter(executed_at__date__lte=end_date)
            clm_qs = clm_qs.filter(created_at__date__lte=end_date)

        total_inv = inv_qs.aggregate(s=Sum("total_amount"))["s"] or Decimal("0.00")
        total_coll = pay_qs.aggregate(s=Sum("amount"))["s"] or Decimal("0.00")
        total_ref = ref_qs.aggregate(s=Sum("amount"))["s"] or Decimal("0.00")
        total_bal = inv_qs.aggregate(s=Sum("balance_due"))["s"] or Decimal("0.00")

        metrics["financial_summary"] = {
            "currency": "INR",
            "total_invoiced": total_inv,
            "total_collected": total_coll,
            "total_refunded": total_ref,
            "net_collected": (total_coll - total_ref).quantize(Decimal("0.01")),
            "total_outstanding_balance": total_bal,
            "unpaid_invoices_count": inv_qs.filter(status__in=[Invoice.Status.ISSUED, Invoice.Status.PARTIALLY_PAID, Invoice.Status.OVERDUE]).count(),
            "claims_submitted_amount": clm_qs.aggregate(s=Sum("claim_amount"))["s"] or Decimal("0.00"),
            "claims_approved_amount": clm_qs.aggregate(s=Sum("approved_amount"))["s"] or Decimal("0.00"),
            "claims_received_amount": clm_qs.aggregate(s=Sum("received_amount"))["s"] or Decimal("0.00"),
        }
        return metrics

    # 4. PHARMACIST DASHBOARD
    if role == "PHARMACIST":
        from pharmacy.models import DispenseRecord, Medicine, MedicineBatch

        med_qs = Medicine.objects.filter(is_active=True)
        batch_qs = MedicineBatch.objects.filter(batch_status=MedicineBatch.BatchStatus.ACTIVE)
        disp_qs = DispenseRecord.objects.all()

        if user_hospital:
            batch_qs = batch_qs.filter(pharmacy_location__hospital=user_hospital)
            disp_qs = disp_qs.filter(prescription__hospital=user_hospital)

        if start_date:
            disp_qs = disp_qs.filter(dispensed_at__date__gte=start_date)
        if end_date:
            disp_qs = disp_qs.filter(dispensed_at__date__lte=end_date)

        low_stock_count = 0
        for med in med_qs:
            tot_qty = batch_qs.filter(medicine=med).aggregate(s=Sum("available_quantity"))["s"] or Decimal("0.00")
            if tot_qty <= med.low_stock_threshold:
                low_stock_count += 1

        total_valuation = batch_qs.aggregate(
            val=Sum(F("available_quantity") * F("selling_price"))
        )["val"] or Decimal("0.00")

        metrics["pharmacy_summary"] = {
            "total_medicines_count": med_qs.count(),
            "active_batches_count": batch_qs.count(),
            "low_stock_medicines_count": low_stock_count,
            "inventory_valuation": total_valuation.quantize(Decimal("0.01")),
            "dispenses_recorded_count": disp_qs.count(),
        }
        return metrics

    # 5. LAB_TECHNICIAN DASHBOARD
    if role == "LAB_TECHNICIAN":
        from laboratory.models import CriticalResultNotification, LabOrder, LabResult, LabSpecimen

        order_qs = LabOrder.objects.all()
        res_qs = LabResult.objects.all()
        crit_qs = CriticalResultNotification.objects.all()

        if user_hospital:
            order_qs = order_qs.filter(hospital=user_hospital)
            res_qs = res_qs.filter(order__hospital=user_hospital)
            crit_qs = crit_qs.filter(result__order__hospital=user_hospital)

        if start_date:
            order_qs = order_qs.filter(order_date__date__gte=start_date)
            res_qs = res_qs.filter(verified_at__date__gte=start_date)
            crit_qs = crit_qs.filter(created_at__date__gte=start_date)
        if end_date:
            order_qs = order_qs.filter(order_date__date__lte=end_date)
            res_qs = res_qs.filter(verified_at__date__lte=end_date)
            crit_qs = crit_qs.filter(created_at__date__lte=end_date)

        metrics["laboratory_summary"] = {
            "total_lab_orders": order_qs.count(),
            "urgent_orders_count": order_qs.filter(priority__in=[LabOrder.Priority.URGENT, LabOrder.Priority.STAT]).count(),
            "results_verified_count": res_qs.filter(status=LabResult.Status.VERIFIED).count(),
            "critical_notifications_count": crit_qs.count(),
            "unacknowledged_critical_count": crit_qs.filter(is_acknowledged=False).count(),
        }
        return metrics

    # 6. RECEPTIONIST DASHBOARD
    if role == "RECEPTIONIST":
        from appointments.models import Appointment
        from inpatient.models import Admission
        from patients.models import Patient

        pat_qs = Patient.objects.all()
        apt_qs = Appointment.objects.all()
        adm_qs = Admission.objects.all()

        if user_hospital:
            pat_qs = pat_qs.filter(hospital=user_hospital)
            apt_qs = apt_qs.filter(hospital=user_hospital)
            adm_qs = adm_qs.filter(hospital=user_hospital)

        metrics["reception_summary"] = {
            "new_patient_registrations": pat_qs.filter(created_at__date__gte=start_date if start_date else today).count(),
            "today_appointments_count": apt_qs.filter(appointment_date=today).count(),
            "pending_checkins_count": apt_qs.filter(appointment_date=today, status=Appointment.Status.CONFIRMED).count(),
            "admissions_requested_count": adm_qs.filter(status=Admission.Status.REQUESTED).count(),
        }
        return metrics

    # 7. SUPER_ADMIN / HOSPITAL_ADMIN (Holistic Hospital Dashboard)
    from appointments.models import Appointment
    from billing.models import InsuranceClaim, Invoice, Payment
    from inpatient.models import Admission, Bed
    from laboratory.models import LabOrder, LabResult
    from patients.models import Patient
    from pharmacy.models import DispenseRecord, Medicine

    # Scoped querysets
    pat_qs = Patient.objects.all()
    apt_qs = Appointment.objects.all()
    adm_qs = Admission.objects.all()
    bed_qs = Bed.objects.all()
    med_qs = Medicine.objects.filter(is_active=True)
    disp_qs = DispenseRecord.objects.all()
    lab_order_qs = LabOrder.objects.all()
    inv_qs = Invoice.objects.exclude(status=Invoice.Status.VOID)
    pay_qs = Payment.objects.filter(status=Payment.Status.COMPLETED)
    clm_qs = InsuranceClaim.objects.exclude(status=InsuranceClaim.Status.CANCELLED)

    if user_hospital:
        pat_qs = pat_qs.filter(hospital=user_hospital)
        apt_qs = apt_qs.filter(hospital=user_hospital)
        adm_qs = adm_qs.filter(hospital=user_hospital)
        bed_qs = bed_qs.filter(room__ward__hospital=user_hospital)
        disp_qs = disp_qs.filter(prescription__hospital=user_hospital)
        lab_order_qs = lab_order_qs.filter(hospital=user_hospital)
        inv_qs = inv_qs.filter(hospital=user_hospital)
        pay_qs = pay_qs.filter(hospital=user_hospital)
        clm_qs = clm_qs.filter(hospital=user_hospital)

    if start_date:
        pat_qs = pat_qs.filter(created_at__date__gte=start_date)
        apt_qs = apt_qs.filter(appointment_date__gte=start_date)
        adm_qs = adm_qs.filter(admission_date__date__gte=start_date)
        disp_qs = disp_qs.filter(dispensed_at__date__gte=start_date)
        lab_order_qs = lab_order_qs.filter(order_date__date__gte=start_date)
        inv_qs = inv_qs.filter(invoice_date__gte=start_date)
        pay_qs = pay_qs.filter(payment_date__date__gte=start_date)
        clm_qs = clm_qs.filter(created_at__date__gte=start_date)

    if end_date:
        pat_qs = pat_qs.filter(created_at__date__lte=end_date)
        apt_qs = apt_qs.filter(appointment_date__lte=end_date)
        adm_qs = adm_qs.filter(admission_date__date__lte=end_date)
        disp_qs = disp_qs.filter(dispensed_at__date__lte=end_date)
        lab_order_qs = lab_order_qs.filter(order_date__date__lte=end_date)
        inv_qs = inv_qs.filter(invoice_date__lte=end_date)
        pay_qs = pay_qs.filter(payment_date__date__lte=end_date)
        clm_qs = clm_qs.filter(created_at__date__lte=end_date)

    total_beds = bed_qs.count()
    occupied_beds = bed_qs.filter(status=Bed.Status.OCCUPIED).count()
    available_beds = bed_qs.filter(status=Bed.Status.AVAILABLE).count()
    occupancy_pct = round((occupied_beds / total_beds * 100), 1) if total_beds > 0 else 0.0

    total_invoiced = inv_qs.aggregate(s=Sum("total_amount"))["s"] or Decimal("0.00")
    total_collected = pay_qs.aggregate(s=Sum("amount"))["s"] or Decimal("0.00")
    total_outstanding = inv_qs.aggregate(s=Sum("balance_due"))["s"] or Decimal("0.00")

    metrics.update({
        "patients": {
            "total_registrations_period": pat_qs.count(),
        },
        "appointments": {
            "total_appointments": apt_qs.count(),
            "confirmed_count": apt_qs.filter(status=Appointment.Status.CONFIRMED).count(),
            "completed_count": apt_qs.filter(status=Appointment.Status.COMPLETED).count(),
            "cancelled_count": apt_qs.filter(status=Appointment.Status.CANCELLED).count(),
            "no_show_count": apt_qs.filter(status=Appointment.Status.NO_SHOW).count(),
        },
        "inpatient": {
            "total_admissions_period": adm_qs.count(),
            "active_admissions_count": adm_qs.filter(status=Admission.Status.ADMITTED).count(),
            "total_beds": total_beds,
            "occupied_beds": occupied_beds,
            "available_beds": available_beds,
            "occupancy_rate_percent": occupancy_pct,
        },
        "pharmacy": {
            "total_medicines": med_qs.count(),
            "dispenses_recorded": disp_qs.count(),
        },
        "laboratory": {
            "total_lab_orders": lab_order_qs.count(),
        },
        "billing": {
            "currency": "INR",
            "total_invoiced": total_invoiced,
            "total_collected": total_collected,
            "total_outstanding": total_outstanding,
            "claims_count": clm_qs.count(),
            "claims_settled_amount": clm_qs.aggregate(s=Sum("received_amount"))["s"] or Decimal("0.00"),
        },
    })
    return metrics


# Operational Reports and CSV Rows Providers

def get_patients_report(hospital=None, start_date=None, end_date=None):
    from patients.models import Patient

    qs = Patient.objects.select_related("user", "hospital")
    if hospital:
        qs = qs.filter(hospital=hospital)
    if start_date:
        qs = qs.filter(created_at__date__gte=start_date)
    if end_date:
        qs = qs.filter(created_at__date__lte=end_date)

    headers = ["MRN", "First Name", "Last Name", "Gender", "Blood Group", "Date of Birth", "Registration Date"]
    rows = []
    for pat in qs[:5000]:
        rows.append([
            pat.mrn,
            pat.user.first_name,
            pat.user.last_name,
            pat.gender,
            pat.blood_group,
            str(pat.date_of_birth),
            pat.created_at.strftime("%Y-%m-%d"),
        ])

    gender_distribution = dict(qs.values("gender").annotate(c=Count("id")).values_list("gender", "c"))
    blood_distribution = dict(qs.values("blood_group").annotate(c=Count("id")).values_list("blood_group", "c"))

    summary = {
        "total_patients": qs.count(),
        "gender_distribution": gender_distribution,
        "blood_group_distribution": blood_distribution,
    }
    return summary, headers, rows


def get_appointments_report(hospital=None, department=None, doctor=None, start_date=None, end_date=None):
    from appointments.models import Appointment

    qs = Appointment.objects.select_related("patient", "patient__user", "doctor", "doctor__user", "hospital", "department")
    if hospital:
        qs = qs.filter(hospital=hospital)
    if department:
        qs = qs.filter(department=department)
    if doctor:
        qs = qs.filter(doctor=doctor)
    if start_date:
        qs = qs.filter(appointment_date__gte=start_date)
    if end_date:
        qs = qs.filter(appointment_date__lte=end_date)

    headers = ["Reference", "Patient MRN", "Doctor", "Department", "Date", "Start Time", "Status", "Type"]
    rows = []
    for apt in qs[:5000]:
        doc_name = apt.doctor.user.get_full_name() if apt.doctor else "Unassigned"
        dept_name = apt.department.name if apt.department else "General"
        rows.append([
            apt.appointment_reference,
            apt.patient.mrn,
            doc_name,
            dept_name,
            str(apt.appointment_date),
            str(apt.start_time),
            apt.status,
            apt.appointment_type,
        ])

    status_counts = dict(qs.values("status").annotate(c=Count("id")).values_list("status", "c"))
    type_counts = dict(qs.values("appointment_type").annotate(c=Count("id")).values_list("appointment_type", "c"))

    summary = {
        "total_appointments": qs.count(),
        "status_breakdown": status_counts,
        "type_breakdown": type_counts,
    }
    return summary, headers, rows


def get_inpatient_report(hospital=None, ward=None, start_date=None, end_date=None):
    from inpatient.models import Admission, Bed

    adm_qs = Admission.objects.select_related("patient", "hospital", "attending_doctor", "attending_doctor__user", "department")
    bed_qs = Bed.objects.all()

    if hospital:
        adm_qs = adm_qs.filter(hospital=hospital)
        bed_qs = bed_qs.filter(room__ward__hospital=hospital)
    if ward:
        bed_qs = bed_qs.filter(room__ward=ward)

    if start_date:
        adm_qs = adm_qs.filter(admission_date__date__gte=start_date)
    if end_date:
        adm_qs = adm_qs.filter(admission_date__date__lte=end_date)

    headers = ["Admission Ref", "Patient MRN", "Attending Doctor", "Department", "Admission Date", "Discharge Date", "Status", "Admission Type"]
    rows = []
    for adm in adm_qs[:5000]:
        doc_name = adm.attending_doctor.user.get_full_name() if adm.attending_doctor else "Unassigned"
        dept_name = adm.department.name if adm.department else "General"
        disch_date = adm.actual_discharge_date.strftime("%Y-%m-%d %H:%M") if adm.actual_discharge_date else ""
        rows.append([
            adm.admission_reference,
            adm.patient.mrn,
            doc_name,
            dept_name,
            adm.admission_date.strftime("%Y-%m-%d %H:%M"),
            disch_date,
            adm.status,
            adm.admission_type,
        ])

    total_beds = bed_qs.count()
    occupied_beds = bed_qs.filter(status=Bed.Status.OCCUPIED).count()
    available_beds = bed_qs.filter(status=Bed.Status.AVAILABLE).count()
    occupancy_rate = round((occupied_beds / total_beds * 100), 1) if total_beds > 0 else 0.0

    summary = {
        "total_admissions": adm_qs.count(),
        "active_inpatients": adm_qs.filter(status=Admission.Status.ADMITTED).count(),
        "total_beds": total_beds,
        "occupied_beds": occupied_beds,
        "available_beds": available_beds,
        "occupancy_rate_percent": occupancy_rate,
        "status_breakdown": dict(adm_qs.values("status").annotate(c=Count("id")).values_list("status", "c")),
    }
    return summary, headers, rows


def get_pharmacy_report(hospital=None, start_date=None, end_date=None):
    from pharmacy.models import DispenseRecord, Medicine, MedicineBatch

    med_qs = Medicine.objects.filter(is_active=True)
    batch_qs = MedicineBatch.objects.filter(batch_status=MedicineBatch.BatchStatus.ACTIVE)
    disp_qs = DispenseRecord.objects.all()

    if hospital:
        batch_qs = batch_qs.filter(pharmacy_location__hospital=hospital)
        disp_qs = disp_qs.filter(prescription__hospital=hospital)

    if start_date:
        disp_qs = disp_qs.filter(dispensed_at__date__gte=start_date)
    if end_date:
        disp_qs = disp_qs.filter(dispensed_at__date__lte=end_date)

    headers = ["Medicine Code", "Brand Name", "Generic Name", "Dosage Form", "Current Stock", "Threshold", "Low Stock Alert"]
    rows = []
    low_stock_count = 0

    for med in med_qs[:5000]:
        tot_qty = batch_qs.filter(medicine=med).aggregate(s=Sum("available_quantity"))["s"] or Decimal("0.00")
        is_low = tot_qty <= med.low_stock_threshold
        if is_low:
            low_stock_count += 1
        rows.append([
            med.code,
            med.brand_name,
            med.generic_name,
            med.dosage_form,
            str(tot_qty),
            str(med.low_stock_threshold),
            "YES" if is_low else "NO",
        ])

    valuation = batch_qs.aggregate(v=Sum(F("available_quantity") * F("selling_price")))["v"] or Decimal("0.00")

    summary = {
        "total_medicines": med_qs.count(),
        "active_batches": batch_qs.count(),
        "low_stock_medicines_count": low_stock_count,
        "inventory_valuation": valuation.quantize(Decimal("0.01")),
        "dispenses_recorded": disp_qs.count(),
    }
    return summary, headers, rows


def get_laboratory_report(hospital=None, start_date=None, end_date=None):
    from laboratory.models import CriticalResultNotification, LabOrder, LabResult

    order_qs = LabOrder.objects.select_related("patient", "ordering_doctor", "ordering_doctor__user")
    res_qs = LabResult.objects.all()
    crit_qs = CriticalResultNotification.objects.all()

    if hospital:
        order_qs = order_qs.filter(hospital=hospital)
        res_qs = res_qs.filter(order__hospital=hospital)
        crit_qs = crit_qs.filter(result__order__hospital=hospital)

    if start_date:
        order_qs = order_qs.filter(order_date__date__gte=start_date)
        res_qs = res_qs.filter(verified_at__date__gte=start_date)
        crit_qs = crit_qs.filter(created_at__date__gte=start_date)
    if end_date:
        order_qs = order_qs.filter(order_date__date__lte=end_date)
        res_qs = res_qs.filter(verified_at__date__lte=end_date)
        crit_qs = crit_qs.filter(created_at__date__lte=end_date)

    headers = ["Order Reference", "Patient MRN", "Doctor", "Priority", "Status", "Order Date", "Specimens Count"]
    rows = []
    for order in order_qs[:5000]:
        doc_name = order.ordering_doctor.user.get_full_name() if order.ordering_doctor else "Unassigned"
        rows.append([
            order.order_reference,
            order.patient.mrn,
            doc_name,
            order.priority,
            order.status,
            order.order_date.strftime("%Y-%m-%d %H:%M"),
            order.specimens.count(),
        ])

    summary = {
        "total_orders": order_qs.count(),
        "verified_results": res_qs.filter(status=LabResult.Status.VERIFIED).count(),
        "critical_alerts_count": crit_qs.count(),
        "priority_breakdown": dict(order_qs.values("priority").annotate(c=Count("id")).values_list("priority", "c")),
        "status_breakdown": dict(order_qs.values("status").annotate(c=Count("id")).values_list("status", "c")),
    }
    return summary, headers, rows


def get_billing_report(hospital=None, start_date=None, end_date=None):
    from billing.models import Invoice, Payment, Refund

    inv_qs = Invoice.objects.select_related("patient").exclude(status=Invoice.Status.VOID)
    pay_qs = Payment.objects.filter(status=Payment.Status.COMPLETED)
    ref_qs = Refund.objects.filter(status=Refund.Status.EXECUTED)

    if hospital:
        inv_qs = inv_qs.filter(hospital=hospital)
        pay_qs = pay_qs.filter(hospital=hospital)
        ref_qs = ref_qs.filter(payment__hospital=hospital)

    if start_date:
        inv_qs = inv_qs.filter(invoice_date__gte=start_date)
        pay_qs = pay_qs.filter(payment_date__date__gte=start_date)
        ref_qs = ref_qs.filter(executed_at__date__gte=start_date)
    if end_date:
        inv_qs = inv_qs.filter(invoice_date__lte=end_date)
        pay_qs = pay_qs.filter(payment_date__date__lte=end_date)
        ref_qs = ref_qs.filter(executed_at__date__lte=end_date)

    headers = ["Invoice Number", "Patient MRN", "Invoice Date", "Due Date", "Status", "Total Amount", "Paid Amount", "Balance Due"]
    rows = []
    for inv in inv_qs[:5000]:
        rows.append([
            inv.invoice_number,
            inv.patient.mrn,
            str(inv.invoice_date),
            str(inv.due_date) if inv.due_date else "",
            inv.status,
            str(inv.total_amount),
            str(inv.paid_amount),
            str(inv.balance_due),
        ])

    total_invoiced = inv_qs.aggregate(s=Sum("total_amount"))["s"] or Decimal("0.00")
    total_collected = pay_qs.aggregate(s=Sum("amount"))["s"] or Decimal("0.00")
    total_refunded = ref_qs.aggregate(s=Sum("amount"))["s"] or Decimal("0.00")
    total_outstanding = inv_qs.aggregate(s=Sum("balance_due"))["s"] or Decimal("0.00")

    summary = {
        "currency": "INR",
        "total_invoiced": total_invoiced,
        "total_collected": total_collected,
        "total_refunded": total_refunded,
        "net_collected": (total_collected - total_refunded).quantize(Decimal("0.01")),
        "total_outstanding_balance": total_outstanding,
        "invoice_count": inv_qs.count(),
        "status_breakdown": dict(inv_qs.values("status").annotate(c=Count("id")).values_list("status", "c")),
    }
    return summary, headers, rows


def get_insurance_report(hospital=None, start_date=None, end_date=None):
    from billing.models import InsuranceClaim

    clm_qs = InsuranceClaim.objects.select_related("patient", "policy", "policy__provider").exclude(status=InsuranceClaim.Status.CANCELLED)

    if hospital:
        clm_qs = clm_qs.filter(hospital=hospital)
    if start_date:
        clm_qs = clm_qs.filter(created_at__date__gte=start_date)
    if end_date:
        clm_qs = clm_qs.filter(created_at__date__lte=end_date)

    headers = ["Claim Reference", "Patient MRN", "Provider", "Policy Number", "Claim Amount", "Approved Amount", "Received Amount", "Status"]
    rows = []
    for clm in clm_qs[:5000]:
        prov_name = clm.policy.provider.name if clm.policy and clm.policy.provider else "N/A"
        pol_num = clm.policy.policy_number if clm.policy else "N/A"
        rows.append([
            clm.claim_reference,
            clm.patient.mrn,
            prov_name,
            pol_num,
            str(clm.claim_amount),
            str(clm.approved_amount),
            str(clm.received_amount),
            clm.status,
        ])

    claimed_tot = clm_qs.aggregate(s=Sum("claim_amount"))["s"] or Decimal("0.00")
    approved_tot = clm_qs.aggregate(s=Sum("approved_amount"))["s"] or Decimal("0.00")
    received_tot = clm_qs.aggregate(s=Sum("received_amount"))["s"] or Decimal("0.00")

    summary = {
        "total_claims": clm_qs.count(),
        "total_claimed_amount": claimed_tot,
        "total_approved_amount": approved_tot,
        "total_received_amount": received_tot,
        "status_breakdown": dict(clm_qs.values("status").annotate(c=Count("id")).values_list("status", "c")),
    }
    return summary, headers, rows
