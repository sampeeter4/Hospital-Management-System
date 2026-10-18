from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class ReportAuditLog(models.Model):
    """
    Append-only immutable audit log tracking access and exports of sensitive hospital reports.
    """

    class Action(models.TextChoices):
        VIEW = "VIEW", "View Report"
        EXPORT_CSV = "EXPORT_CSV", "Export CSV"

    class ReportType(models.TextChoices):
        DASHBOARD = "DASHBOARD", "Dashboard Summary"
        PATIENTS = "PATIENTS", "Patient Registrations Report"
        APPOINTMENTS = "APPOINTMENTS", "Appointments & Scheduling Report"
        INPATIENT = "INPATIENT", "Inpatient & Occupancy Report"
        PHARMACY = "PHARMACY", "Pharmacy Inventory & Dispense Report"
        LABORATORY = "LABORATORY", "Laboratory & Diagnostics Report"
        BILLING = "BILLING", "Billing & Revenue Report"
        INSURANCE = "INSURANCE", "Insurance Claims Report"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="report_audit_logs",
    )
    report_type = models.CharField(
        max_length=50,
        choices=ReportType.choices,
        db_index=True,
    )
    action = models.CharField(
        max_length=20,
        choices=Action.choices,
        default=Action.VIEW,
        db_index=True,
    )
    hospital = models.ForeignKey(
        "hospitals.Hospital",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="report_audit_logs",
    )
    parameters = models.JSONField(
        default=dict,
        blank=True,
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
    )
    records_count = models.PositiveIntegerField(
        default=0,
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["report_type", "action"]),
            models.Index(fields=["user", "timestamp"]),
        ]

    def clean(self):
        super().clean()
        if self.pk:
            raise ValidationError("Report audit logs are strictly immutable and cannot be edited.")

    def delete(self, *args, **kwargs):
        raise ValidationError("Report audit logs cannot be deleted.")

    def __str__(self):
        username = self.user.username if self.user else "Anonymous"
        return f"{self.timestamp} - {username} [{self.action}] {self.report_type}"

