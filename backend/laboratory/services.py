from datetime import date
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

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
)


def record_lab_audit(
    resource_type,
    resource_id,
    action,
    user,
    patient=None,
    description="",
    metadata=None,
):
    """
    Append-only audit trail logging for laboratory events.
    """
    user_role = getattr(user, "role", "") if user else ""
    return LabAuditLog.objects.create(
        resource_type=resource_type,
        resource_id=str(resource_id),
        action=action,
        user=user if user and user.is_authenticated else None,
        user_role=user_role,
        patient=patient,
        description=description,
        metadata=metadata or {},
    )


def match_reference_range(parameter, patient):
    """
    Finds the most specific configured active reference range for a parameter,
    accounting for patient age and sex.
    """
    patient_age = 30  # Default assumption if patient DOB is missing
    patient_gender = "ANY"

    if patient:
        if patient.gender:
            patient_gender = patient.gender.upper()
        if patient.date_of_birth:
            today = date.today()
            dob = patient.date_of_birth
            patient_age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

    ranges = parameter.reference_ranges.filter(is_active=True)

    # 1. Match specific gender and age
    exact_match = ranges.filter(
        gender=patient_gender,
        age_min_years__lte=patient_age,
        age_max_years__gte=patient_age,
    ).first()
    if exact_match:
        return exact_match

    # 2. Match ANY gender and age
    any_gender_match = ranges.filter(
        gender="ANY",
        age_min_years__lte=patient_age,
        age_max_years__gte=patient_age,
    ).first()
    if any_gender_match:
        return any_gender_match

    # 3. Fallback to any active range
    return ranges.first()


def evaluate_parameter_value(parameter, patient, numeric_val=None, text_val=""):
    """
    Evaluates measured value against configured reference ranges and critical thresholds.
    Returns: (abnormality_flag, is_critical, critical_flag, reference_range_display)
    """
    ref_range = match_reference_range(parameter, patient)

    abnormality_flag = LabResultParameter.AbnormalityFlag.NORMAL
    is_critical = False
    critical_flag = LabResultParameter.CriticalFlag.NONE
    ref_display = ""

    if not ref_range:
        return abnormality_flag, is_critical, critical_flag, ref_display

    if parameter.data_type == "NUMERIC" and numeric_val is not None:
        min_v = ref_range.min_normal_value
        max_v = ref_range.max_normal_value
        crit_low = ref_range.critical_low_value
        crit_high = ref_range.critical_high_value

        parts = []
        if min_v is not None and max_v is not None:
            parts.append(f"{min_v} - {max_v}")
        elif min_v is not None:
            parts.append(f">= {min_v}")
        elif max_v is not None:
            parts.append(f"<= {max_v}")
        ref_display = " ".join(parts)

        # Check critical thresholds first
        if crit_low is not None and numeric_val <= crit_low:
            is_critical = True
            critical_flag = LabResultParameter.CriticalFlag.CRITICAL_LOW
            abnormality_flag = LabResultParameter.AbnormalityFlag.LOW
        elif crit_high is not None and numeric_val >= crit_high:
            is_critical = True
            critical_flag = LabResultParameter.CriticalFlag.CRITICAL_HIGH
            abnormality_flag = LabResultParameter.AbnormalityFlag.HIGH
        # Check standard normal reference range
        elif min_v is not None and numeric_val < min_v:
            abnormality_flag = LabResultParameter.AbnormalityFlag.LOW
        elif max_v is not None and numeric_val > max_v:
            abnormality_flag = LabResultParameter.AbnormalityFlag.HIGH

    elif parameter.data_type in ["QUALITATIVE", "TEXT", "BOOLEAN"] and text_val:
        normal_text = ref_range.normal_text_value
        ref_display = normal_text or "Expected normal"
        if normal_text and text_val.strip().lower() != normal_text.strip().lower():
            abnormality_flag = LabResultParameter.AbnormalityFlag.ABNORMAL

    return abnormality_flag, is_critical, critical_flag, ref_display


@transaction.atomic
def collect_specimen(specimen, user, collection_location=""):
    """
    Records collection of laboratory specimen.
    """
    if specimen.status not in [LabSpecimen.Status.PENDING_COLLECTION, LabSpecimen.Status.REJECTED]:
        raise ValidationError({"status": f"Specimen in status {specimen.status} cannot be collected."})

    specimen.status = LabSpecimen.Status.COLLECTED
    specimen.collected_at = timezone.now()
    specimen.collected_by = user
    if collection_location:
        specimen.collection_location = collection_location.strip()
    specimen.save()

    # Update linked order items
    specimen.order_items.filter(status=LabOrderItem.ItemStatus.PENDING).update(
        status=LabOrderItem.ItemStatus.COLLECTED
    )

    order = specimen.order
    if order.status == LabOrder.Status.ORDERED:
        order.status = LabOrder.Status.COLLECTED
        order.save()

    record_lab_audit(
        resource_type="SPECIMEN",
        resource_id=specimen.barcode,
        action="COLLECTED",
        user=user,
        patient=order.patient,
        description=f"Specimen {specimen.barcode} collected by {user.username}",
    )
    return specimen


@transaction.atomic
def receive_specimen(specimen, user):
    """
    Confirms specimen arrival and accessioning in laboratory.
    """
    if specimen.status != LabSpecimen.Status.COLLECTED:
        raise ValidationError({"status": f"Specimen must be COLLECTED before receipt. Current status: {specimen.status}."})

    specimen.status = LabSpecimen.Status.RECEIVED
    specimen.received_at = timezone.now()
    specimen.received_by = user
    specimen.save()

    specimen.order_items.filter(status=LabOrderItem.ItemStatus.COLLECTED).update(
        status=LabOrderItem.ItemStatus.PROCESSING
    )

    order = specimen.order
    order.status = LabOrder.Status.PROCESSING
    order.save()

    record_lab_audit(
        resource_type="SPECIMEN",
        resource_id=specimen.barcode,
        action="RECEIVED",
        user=user,
        patient=order.patient,
        description=f"Specimen {specimen.barcode} received in lab by {user.username}",
    )
    return specimen


@transaction.atomic
def reject_specimen(specimen, user, rejection_reason):
    """
    Rejects an unacceptable specimen (hemolyzed, clotted, improper tube, insufficient quantity).
    """
    if not rejection_reason or not rejection_reason.strip():
        raise ValidationError({"rejection_reason": "A documented reason is required to reject a specimen."})

    if specimen.status in [LabSpecimen.Status.COMPLETED, LabSpecimen.Status.REJECTED, LabSpecimen.Status.CANCELLED]:
        raise ValidationError({"status": f"Specimen in status {specimen.status} cannot be rejected."})

    specimen.status = LabSpecimen.Status.REJECTED
    specimen.rejected_at = timezone.now()
    specimen.rejected_by = user
    specimen.rejection_reason = rejection_reason.strip()
    specimen.save()

    record_lab_audit(
        resource_type="SPECIMEN",
        resource_id=specimen.barcode,
        action="REJECTED",
        user=user,
        patient=specimen.order.patient,
        description=f"Specimen {specimen.barcode} rejected by {user.username}: {rejection_reason.strip()}",
    )
    return specimen


@transaction.atomic
def enter_lab_result(
    order_item,
    specimen,
    parameter_values_data,
    user,
    overall_interpretation="",
    clinical_comments="",
):
    """
    Enters laboratory results and individual analyte values.
    Validates specimen integrity and evaluates abnormal/critical thresholds.
    """
    if order_item.status in [LabOrderItem.ItemStatus.VERIFIED, LabOrderItem.ItemStatus.CANCELLED]:
        raise ValidationError({"order_item": f"Cannot enter results for order item in status {order_item.status}."})

    if specimen and specimen.status in [LabSpecimen.Status.REJECTED, LabSpecimen.Status.CANCELLED]:
        raise ValidationError({"specimen": f"Cannot enter results for a {specimen.status} specimen."})

    result, _ = LabResult.objects.get_or_create(
        order_item=order_item,
        defaults={
            "specimen": specimen,
            "entered_by": user,
            "entered_at": timezone.now(),
            "status": LabResult.Status.ENTERED,
        },
    )

    result.specimen = specimen
    result.overall_interpretation = overall_interpretation
    result.clinical_comments = clinical_comments
    result.entered_by = user
    result.entered_at = timezone.now()
    result.status = LabResult.Status.ENTERED

    patient = order_item.order.patient
    has_any_abnormal = False
    has_any_critical = False

    for param_data in parameter_values_data:
        param_obj = param_data.get("parameter")
        num_val = param_data.get("numeric_value")
        txt_val = param_data.get("text_value", "")

        abnormality, is_crit, crit_flag, range_display = evaluate_parameter_value(
            parameter=param_obj,
            patient=patient,
            numeric_val=num_val,
            text_val=txt_val,
        )

        if abnormality != LabResultParameter.AbnormalityFlag.NORMAL:
            has_any_abnormal = True
        if is_crit:
            has_any_critical = True

        LabResultParameter.objects.update_or_create(
            result=result,
            parameter=param_obj,
            defaults={
                "numeric_value": num_val,
                "text_value": txt_val,
                "unit": param_obj.unit or "",
                "reference_range_display": range_display,
                "abnormality_flag": abnormality,
                "is_critical": is_crit,
                "critical_flag": crit_flag,
            },
        )

    result.is_abnormal = has_any_abnormal
    result.is_critical = has_any_critical
    result.save()

    order_item.status = LabOrderItem.ItemStatus.RESULTED
    order_item.save()

    record_lab_audit(
        resource_type="RESULT",
        resource_id=result.result_reference,
        action="ENTERED",
        user=user,
        patient=patient,
        description=f"Results entered for {order_item.test.name} by {user.username}",
    )
    return result


@transaction.atomic
def verify_lab_result(result, user):
    """
    Verifies and officially releases a laboratory result.
    Generates a CriticalResultNotification if critical threshold is exceeded.
    """
    if result.status not in [LabResult.Status.ENTERED, LabResult.Status.PENDING_REVIEW, LabResult.Status.DRAFT]:
        raise ValidationError({"status": f"Cannot verify result with status {result.status}."})

    if result.specimen and result.specimen.status in [LabSpecimen.Status.REJECTED, LabSpecimen.Status.CANCELLED]:
        raise ValidationError({"specimen": "Cannot verify result linked to a rejected or cancelled specimen."})

    result.status = LabResult.Status.VERIFIED
    result.verified_by = user
    result.verified_at = timezone.now()
    result.save()

    order_item = result.order_item
    order_item.status = LabOrderItem.ItemStatus.VERIFIED
    order_item.save()

    # Recompute order status
    order = order_item.order
    all_items = list(order.items.all())
    if all(item.status == LabOrderItem.ItemStatus.VERIFIED for item in all_items):
        order.status = LabOrder.Status.COMPLETED
        order.save()

    # Check for critical result alert
    if result.is_critical:
        # Check if notification already exists to prevent duplicate alert spam
        existing = CriticalResultNotification.objects.filter(result=result).first()
        if not existing:
            crit_params = result.parameter_values.filter(is_critical=True)
            details_list = [f"{p.parameter.name}: {p.numeric_value or p.text_value} {p.unit} ({p.critical_flag})" for p in crit_params]
            CriticalResultNotification.objects.create(
                result=result,
                order=order,
                patient=order.patient,
                critical_details="; ".join(details_list),
                status=CriticalResultNotification.Status.PENDING_ACKNOWLEDGEMENT,
            )

    record_lab_audit(
        resource_type="RESULT",
        resource_id=result.result_reference,
        action="VERIFIED",
        user=user,
        patient=order.patient,
        description=f"Result {result.result_reference} verified and released by {user.username}",
    )
    return result


@transaction.atomic
def correct_verified_result(result, user, parameter_corrections_data, correction_reason):
    """
    Audited correction of an already verified lab result preserving full historical audit trail.
    parameter_corrections_data format:
    [
        {"parameter": param_obj, "new_numeric_value": 14.2, "new_text_value": ""},
        ...
    ]
    """
    if result.status not in [LabResult.Status.VERIFIED, LabResult.Status.CORRECTED]:
        raise ValidationError({"status": "Only verified results may undergo formal correction workflow."})

    if not correction_reason or not correction_reason.strip():
        raise ValidationError({"correction_reason": "A clinical reason is required to correct verified results."})

    patient = result.order_item.order.patient

    for item in parameter_corrections_data:
        param_obj = item["parameter"]
        new_num = item.get("new_numeric_value")
        new_txt = item.get("new_text_value", "")

        param_val = result.parameter_values.filter(parameter=param_obj).first()
        prev_num = param_val.numeric_value if param_val else None
        prev_txt = param_val.text_value if param_val else ""

        # Record immutable correction history
        LabResultCorrection.objects.create(
            result=result,
            parameter=param_obj,
            previous_numeric_value=prev_num,
            previous_text_value=prev_txt,
            new_numeric_value=new_num,
            new_text_value=new_txt,
            correction_reason=correction_reason.strip(),
            corrected_by=user,
        )

        abnormality, is_crit, crit_flag, range_display = evaluate_parameter_value(
            parameter=param_obj,
            patient=patient,
            numeric_val=new_num,
            text_val=new_txt,
        )

        if param_val:
            param_val.numeric_value = new_num
            param_val.text_value = new_txt
            param_val.abnormality_flag = abnormality
            param_val.is_critical = is_crit
            param_val.critical_flag = crit_flag
            param_val.reference_range_display = range_display
            param_val.save()

    result.status = LabResult.Status.CORRECTED
    result.is_critical = result.parameter_values.filter(is_critical=True).exists()
    result.is_abnormal = result.parameter_values.exclude(abnormality_flag="NORMAL").exists()
    result.save()

    record_lab_audit(
        resource_type="RESULT",
        resource_id=result.result_reference,
        action="CORRECTED",
        user=user,
        patient=patient,
        description=f"Result {result.result_reference} corrected by {user.username}: {correction_reason.strip()}",
        metadata={"reason": correction_reason.strip()},
    )
    return result


@transaction.atomic
def acknowledge_critical_notification(notification, user, notes=""):
    """
    Clinician acknowledgement of a critical laboratory result notification.
    """
    if notification.status == CriticalResultNotification.Status.ACKNOWLEDGED:
        raise ValidationError({"status": "Critical notification has already been acknowledged."})

    notification.status = CriticalResultNotification.Status.ACKNOWLEDGED
    notification.acknowledged_at = timezone.now()
    notification.acknowledged_by = user
    notification.acknowledgement_notes = notes.strip() if notes else ""
    notification.save()

    record_lab_audit(
        resource_type="NOTIFICATION",
        resource_id=notification.notification_reference,
        action="ACKNOWLEDGED",
        user=user,
        patient=notification.patient,
        description=f"Critical notification {notification.notification_reference} acknowledged by {user.username}",
    )
    return notification

