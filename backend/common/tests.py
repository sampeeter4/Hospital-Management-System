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
