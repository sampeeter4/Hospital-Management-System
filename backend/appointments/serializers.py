from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import Appointment, AppointmentStatusHistory, DoctorAvailability
from .services import validate_booking


class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(
        source="doctor.user.get_full_name",
        read_only=True,
    )
    day_name = serializers.CharField(
        source="get_day_of_week_display",
        read_only=True,
    )

    class Meta:
        model = DoctorAvailability
        fields = [
            "id",
            "doctor",
            "doctor_name",
            "day_of_week",
            "day_name",
            "start_time",
            "end_time",
            "slot_duration",
            "is_active",
            "effective_start_date",
            "effective_end_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "doctor_name",
            "day_name",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):
        # Prevent non-admin doctor from modifying other doctors' schedules
        request = self.context.get("request")
        if request and request.user.role == "DOCTOR":
            if not hasattr(request.user, "doctor_profile"):
                raise serializers.ValidationError("Doctor profile not found for this user.")
            assigned_doctor = data.get("doctor") or getattr(self.instance, "doctor", None)
            if assigned_doctor and assigned_doctor.id != request.user.doctor_profile.id:
                raise serializers.ValidationError(
                    {"doctor": "You can only manage availability for your own doctor profile."}
                )

        instance = DoctorAvailability(**data)
        if self.instance:
            instance.pk = self.instance.pk
        try:
            instance.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)

        return data


class AppointmentStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_username = serializers.CharField(
        source="changed_by.username",
        read_only=True,
    )

    class Meta:
        model = AppointmentStatusHistory
        fields = [
            "id",
            "appointment",
            "previous_status",
            "new_status",
            "changed_by",
            "changed_by_username",
            "reason",
            "created_at",
        ]
        read_only_fields = fields


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(
        source="patient.user.get_full_name",
        read_only=True,
    )
    patient_mrn = serializers.CharField(
        source="patient.mrn",
        read_only=True,
    )
    doctor_name = serializers.CharField(
        source="doctor.user.get_full_name",
        read_only=True,
    )
    doctor_id_code = serializers.CharField(
        source="doctor.doctor_id",
        read_only=True,
    )
    hospital_name = serializers.CharField(
        source="hospital.name",
        read_only=True,
    )
    department_name = serializers.CharField(
        source="department.name",
        read_only=True,
    )
    booked_by_username = serializers.CharField(
        source="booked_by.username",
        read_only=True,
    )

    class Meta:
        model = Appointment
        fields = [
            "id",
            "appointment_reference",
            "patient",
            "patient_name",
            "patient_mrn",
            "doctor",
            "doctor_name",
            "doctor_id_code",
            "hospital",
            "hospital_name",
            "department",
            "department_name",
            "appointment_date",
            "start_time",
            "end_time",
            "appointment_type",
            "status",
            "reason_for_visit",
            "patient_notes",
            "staff_notes",
            "cancellation_reason",
            "cancelled_at",
            "cancelled_by",
            "booked_by",
            "booked_by_username",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "appointment_reference",
            "patient_name",
            "patient_mrn",
            "doctor_name",
            "doctor_id_code",
            "hospital_name",
            "department_name",
            "status",
            "cancellation_reason",
            "cancelled_at",
            "cancelled_by",
            "booked_by",
            "booked_by_username",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "patient": {"required": False},
            "hospital": {"required": False},
            "department": {"required": False},
        }

    def validate(self, data):
        request = self.context.get("request")
        user = request.user if request else None

        # Derive hospital and department from doctor if omitted
        doctor = data.get("doctor") or (self.instance.doctor if self.instance else None)
        if not doctor:
            raise serializers.ValidationError({"doctor": "Doctor is required."})

        if "hospital" not in data or not data.get("hospital"):
            data["hospital"] = doctor.hospital
        if "department" not in data or not data.get("department"):
            data["department"] = doctor.department

        # Patient authorization check
        patient = data.get("patient") or (self.instance.patient if self.instance else None)
        if user and user.role == "PATIENT":
            if not hasattr(user, "patient_profile"):
                raise serializers.ValidationError({"patient": "Patient profile not found for current user."})
            if patient and patient.id != user.patient_profile.id:
                raise serializers.ValidationError({"patient": "Patients may only book appointments for themselves."})
            data["patient"] = user.patient_profile
            patient = user.patient_profile

        if not patient:
            raise serializers.ValidationError({"patient": "Patient is required."})

        # Booking date & time validation
        appointment_date = data.get("appointment_date") or (self.instance.appointment_date if self.instance else None)
        start_time = data.get("start_time") or (self.instance.start_time if self.instance else None)
        end_time = data.get("end_time") or (self.instance.end_time if self.instance else None)

        if appointment_date and start_time and end_time:
            exclude_id = self.instance.pk if self.instance else None
            try:
                validate_booking(
                    doctor=doctor,
                    patient=patient,
                    appointment_date=appointment_date,
                    start_time=start_time,
                    end_time=end_time,
                    exclude_appointment_id=exclude_id,
                )
            except DjangoValidationError as exc:
                raise serializers.ValidationError(
                    exc.message_dict if hasattr(exc, "message_dict") else exc.messages
                )

        return data

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user:
            validated_data["booked_by"] = request.user
        return super().create(validated_data)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get("request")
        # Hide confidential staff notes from patients
        if request and request.user and request.user.role == "PATIENT":
            representation.pop("staff_notes", None)
        return representation


class AppointmentCancelSerializer(serializers.Serializer):
    cancellation_reason = serializers.CharField(
        required=True,
        min_length=3,
        help_text="Reason for cancelling the appointment.",
    )


class AppointmentRescheduleSerializer(serializers.Serializer):
    appointment_date = serializers.DateField(
        required=True,
        help_text="New appointment date (YYYY-MM-DD).",
    )
    start_time = serializers.TimeField(
        required=True,
        help_text="New start time (HH:MM:SS).",
    )
    end_time = serializers.TimeField(
        required=True,
        help_text="New end time (HH:MM:SS).",
    )


class AvailableSlotSerializer(serializers.Serializer):
    start_time = serializers.CharField(help_text="Slot start time (HH:MM:SS)")
    end_time = serializers.CharField(help_text="Slot end time (HH:MM:SS)")
    slot_duration = serializers.IntegerField(help_text="Duration in minutes")

