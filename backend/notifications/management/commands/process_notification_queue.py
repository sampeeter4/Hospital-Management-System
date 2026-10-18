from django.core.management.base import BaseCommand

from notifications.services import process_notification_queue


class Command(BaseCommand):
    help = "Processes queued and retrying external notification deliveries"

    def add_arguments(self, parser):
        parser.add_argument(
            "--max-retries",
            type=int,
            default=3,
            help="Maximum retry attempts before marking permanent failure",
        )

    def handle(self, *args, **options):
        max_retries = options["max_retries"]
        self.stdout.write("Starting notification queue processing...")
        results = process_notification_queue(max_retries=max_retries)
        self.stdout.write(
            self.style.SUCCESS(
                f"Completed queue processing: Total: {results['total']}, Sent: {results['sent']}, "
                f"Retrying: {results['retrying']}, Failed: {results['failed']}"
            )
        )

