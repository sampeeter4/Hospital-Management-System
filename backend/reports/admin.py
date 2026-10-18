from django.contrib import admin

from .models import ReportAuditLog


@admin.register(ReportAuditLog)
class ReportAuditLogAdmin(admin.ModelAdmin):
    list_display = ["timestamp", "user", "report_type", "action", "hospital", "records_count", "ip_address"]
    list_filter = ["report_type", "action", "hospital", "timestamp"]
    search_fields = ["user__username", "user__email", "ip_address"]
    readonly_fields = ["user", "report_type", "action", "hospital", "parameters", "ip_address", "records_count", "timestamp"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

