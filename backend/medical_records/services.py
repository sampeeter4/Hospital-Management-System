from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import (
    ClinicalAuditLog,
    ClinicalEncounter,
    ClinicalNote,
    ClinicalNoteAddendum,
    EncounterDiagnosis,
    MedicalHistoryEntry,
    VitalSigns,
)


def record_clinical_audit(
    resource_type,
    resource_id,
    action,
    user,
    patient=None,
    description="",
    metadata=None,
):
    """
    Append-only audit record for clinical changes.
    """
    user_role = getattr(user, "role", "") if user else ""
    return ClinicalAuditLog.objects.create(
        resource_type=resource_type,
        resource_id=str(resource_id),
        action=action,
        user=user if user and user.is_authenticated else None,
        user_role=user_role,
        patient=patient,
        description=description,
        metadata=metadata or {},
    )


@transaction.atomic
def close_clinical_encounter(encounter, user):
    """
    Closes a clinical encounter and audits the closure.
    """
    if encounter.status == ClinicalEncounter.Status.CLOSED:
        raise ValidationError({"status": "Clinical encounter is already closed."})

    encounter.status = ClinicalEncounter.Status.CLOSED
    encounter.closed_by = user
    encounter.closed_at = timezone.now()
    if not encounter.end_time:
        encounter.end_time = encounter.closed_at

    encounter.save()

    record_clinical_audit(
        resource_type="ENCOUNTER",
        resource_id=encounter.id,
        action="CLOSED",
        user=user,
        patient=encounter.patient,
        description=f"Encounter {encounter.encounter_reference} closed by {user.username}",
    )
    return encounter


@transaction.atomic
def sign_clinical_note(clinical_note, user):
    """
    Signs and finalizes a clinical note, locking it from ordinary modifications.
    """
    if clinical_note.status == ClinicalNote.Status.SIGNED:
        raise ValidationError({"status": "Clinical note is already signed and finalized."})

    clinical_note.status = ClinicalNote.Status.SIGNED
    clinical_note.signed_by = user
    clinical_note.signed_at = timezone.now()
    clinical_note.save()

    record_clinical_audit(
        resource_type="CLINICAL_NOTE",
        resource_id=clinical_note.id,
        action="SIGNED",
        user=user,
        patient=clinical_note.encounter.patient,
        description=f"Clinical note #{clinical_note.id} signed by {user.username}",
    )
    return clinical_note


@transaction.atomic
def add_clinical_note_addendum(clinical_note, user, reason, addendum_content):
    """
    Adds a formal addendum to a signed clinical note preserving original narrative.
    """
    if clinical_note.status != ClinicalNote.Status.SIGNED:
        raise ValidationError({
            "status": "Addenda can only be recorded for signed clinical notes. Edit the draft note directly."
        })

    if not reason or not reason.strip():
        raise ValidationError({"reason": "A clinical reason is required to record an addendum."})

    if not addendum_content or not addendum_content.strip():
        raise ValidationError({"addendum_content": "Addendum clinical narrative cannot be blank."})

    addendum = ClinicalNoteAddendum.objects.create(
        clinical_note=clinical_note,
        reason=reason.strip(),
        addendum_content=addendum_content.strip(),
        author=user,
    )

    record_clinical_audit(
        resource_type="CLINICAL_NOTE",
        resource_id=clinical_note.id,
        action="ADDENDUM_ADDED",
        user=user,
        patient=clinical_note.encounter.patient,
        description=f"Addendum #{addendum.id} added to note #{clinical_note.id} by {user.username}",
        metadata={"reason": reason},
    )
    return addendum


def build_patient_timeline(patient, user, category=None):
    """
    Constructs a unified, chronological clinical timeline for a patient.
    Enforces privacy rules: patients only see patient-visible, signed notes.
    """
    timeline = []
    is_patient_user = bool(user and getattr(user, "role", "") == "PATIENT")

    # 1. Encounters
    if not category or category in ["encounters", "all"]:
        encounters = ClinicalEncounter.objects.filter(patient=patient).select_related("doctor", "doctor__user", "hospital")
        for enc in encounters:
            dt = enc.start_time or timezone.make_aware(timezone.datetime.combine(enc.encounter_date, timezone.datetime.min.time()))
            timeline.append({
                "category": "ENCOUNTER",
                "timestamp": dt.isoformat(),
                "reference_id": enc.encounter_reference,
                "title": f"{enc.get_encounter_type_display()} ({enc.get_status_display()})",
                "summary": enc.chief_complaint,
                "details": {
                    "encounter_id": enc.id,
                    "doctor": enc.doctor.user.get_full_name() or enc.doctor.doctor_id,
                    "hospital": enc.hospital.name,
                    "status": enc.status,
                },
            })

    # 2. Vital Signs
    if not category or category in ["vitals", "all"]:
        vitals = VitalSigns.objects.filter(encounter__patient=patient).select_related("encounter")
        for v in vitals:
            bp_str = f"{v.systolic_bp}/{v.diastolic_bp} mmHg" if (v.systolic_bp and v.diastolic_bp) else "N/A"
            timeline.append({
                "category": "VITALS",
                "timestamp": v.measured_at.isoformat(),
                "reference_id": f"VIT-{v.id}",
                "title": f"Vital Signs: BP {bp_str}, HR {v.heart_rate or 'N/A'} bpm",
                "summary": f"Temp: {v.temperature or 'N/A'}{v.temperature_unit}, SpO2: {v.oxygen_saturation or 'N/A'}%, BMI: {v.bmi or 'N/A'}",
                "details": {
                    "vitals_id": v.id,
                    "encounter_reference": v.encounter.encounter_reference,
                    "systolic_bp": v.systolic_bp,
                    "diastolic_bp": v.diastolic_bp,
                    "heart_rate": v.heart_rate,
                    "temperature": str(v.temperature) if v.temperature else None,
                    "bmi": str(v.bmi) if v.bmi else None,
                },
            })

    # 3. Diagnoses
    if not category or category in ["diagnoses", "all"]:
        diagnoses = EncounterDiagnosis.objects.filter(encounter__patient=patient).select_related("encounter")
        for diag in diagnoses:
            created_dt = diag.created_at
            timeline.append({
                "category": "DIAGNOSIS",
                "timestamp": created_dt.isoformat(),
                "reference_id": f"DX-{diag.id}",
                "title": f"{'Primary ' if diag.is_primary else ''}Diagnosis: {diag.diagnosis_description}",
                "summary": f"Code: {diag.diagnosis_code or 'N/A'} ({diag.code_system}), Status: {diag.get_clinical_status_display()}",
                "details": {
                    "diagnosis_id": diag.id,
                    "encounter_reference": diag.encounter.encounter_reference,
                    "is_primary": diag.is_primary,
                    "diagnosis_type": diag.diagnosis_type,
                    "clinical_status": diag.clinical_status,
                },
            })

    # 4. Clinical Notes
    if not category or category in ["notes", "all"]:
        notes_qs = ClinicalNote.objects.filter(encounter__patient=patient).select_related("encounter", "author")
        if is_patient_user:
            # Patient can only view finalized, patient-visible notes
            notes_qs = notes_qs.filter(is_patient_visible=True, status=ClinicalNote.Status.SIGNED)

        for note in notes_qs:
            dt = note.signed_at or note.created_at
            timeline.append({
                "category": "CLINICAL_NOTE",
                "timestamp": dt.isoformat(),
                "reference_id": f"NOTE-{note.id}",
                "title": f"{note.get_note_type_display()} ({note.get_status_display()})",
                "summary": note.assessment or note.summary or note.subjective[:100],
                "details": {
                    "note_id": note.id,
                    "encounter_reference": note.encounter.encounter_reference,
                    "status": note.status,
                    "note_type": note.note_type,
                    "author": note.author.get_full_name() if note.author else "Staff",
                    "addenda_count": note.addenda.count(),
                },
            })

    # 5. Medical History Entries
    if not category or category in ["history", "all"]:
        history_entries = MedicalHistoryEntry.objects.filter(patient=patient)
        for h in history_entries:
            dt = (
                timezone.make_aware(timezone.datetime.combine(h.onset_date, timezone.datetime.min.time()))
                if h.onset_date
                else h.created_at
            )
            timeline.append({
                "category": "MEDICAL_HISTORY",
                "timestamp": dt.isoformat(),
                "reference_id": f"MH-{h.id}",
                "title": f"{h.get_category_display()}: {h.title}",
                "summary": h.description,
                "details": {
                    "history_id": h.id,
                    "category": h.category,
                    "status": h.status,
                    "onset_date": str(h.onset_date) if h.onset_date else None,
                    "resolution_date": str(h.resolution_date) if h.resolution_date else None,
                },
            })

    # Sort reverse chronologically
    timeline.sort(key=lambda item: item["timestamp"], reverse=True)
    return timeline
