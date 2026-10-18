from django.core.management.base import BaseCommand

from notifications.services import send_appointment_reminders


class Command(BaseCommand):
    help = "Scans upcoming appointments and sends reminder alerts to patients"

    def add_arguments(self, parser):
        parser.add_argument(
            "--window-hours",
            type=int,
            default=24,
            help="Upcoming time window in hours to scan for eligible appointments (default: 24)",
        )

    def handle(self, *args, **options):
        window_hours = options["window_hours"]
        self.stdout.write(f"Scanning for appointment reminders within {window_hours} hours...")
        count = send_appointment_reminders(window_hours=window_hours)
        self.stdout.write(
            self.style.SUCCESS(f"Successfully dispatched {count} appointment reminder(s).")
        )

