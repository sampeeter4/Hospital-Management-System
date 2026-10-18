from rest_framework import serializers

from .models import ReportAuditLog


class ReportAuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    hospital_name = serializers.CharField(source="hospital.name", read_only=True)

    class Meta:
        model = ReportAuditLog
        fields = [
            "id",
            "username",
            "report_type",
            "action",
            "hospital_name",
            "parameters",
            "ip_address",
            "records_count",
            "timestamp",
        ]
        read_only_fields = fields

