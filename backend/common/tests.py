from unittest.mock import patch
from django.db import OperationalError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class HealthCheckAPITests(APITestCase):
    def test_health_check_endpoint(self):
        url = reverse('health-check')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('status'), 'success')
        self.assertEqual(
            response.data.get('message'),
            'Hospital Management System API is running',
        )
        self.assertEqual(response.data.get('version'), '1.0')
        self.assertIn('services', response.data)
        self.assertEqual(response.data['services'].get('database'), 'healthy')

    @patch('django.db.connection.cursor')
    def test_health_check_database_failure(self, mock_cursor):
        mock_cursor.side_effect = OperationalError("Database connection refused")
        url = reverse('health-check')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data.get('status'), 'unhealthy')
        self.assertEqual(response.data['services'].get('database'), 'unhealthy')

