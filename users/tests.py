from django.test import TestCase
from django.urls import reverse
from .models import User

# Create your tests here.

class UserTestCase(TestCase):
    def setUp(self):
        # El modelo User tiene validación de email institucional (@ucol.mx)
        # y requiere no_cuenta_v al ser creado.
        self.email = 'testuser@ucol.mx'
        self.password = 'testpassword123'
        self.user = User.objects.create_user(
            username='testuser',
            email=self.email,
            password=self.password,
            first_name='Gael',
            last_name='Valencia',
            no_cuenta_v='20181234'
        )
    
    def test_login_success(self):
        # Probamos enviando campos válidos por POST regular
        response = self.client.post(
            reverse('login'),
            data={'email': self.email, 'password': self.password}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['success'], True)
        self.assertEqual(response.json()['user']['email'], self.email)

    def test_login_success_json(self):
        # Probamos enviando campos válidos como payload JSON
        response = self.client.post(
            reverse('login'),
            data={'email': self.email, 'password': self.password},
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['success'], True)
        self.assertEqual(response.json()['user']['email'], self.email)

    def test_login_failure_incorrect_password(self):
        response = self.client.post(
            reverse('login'),
            data={'email': self.email, 'password': 'wrongpassword'}
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()['success'], False)

    def test_login_failure_non_ucol_email(self):
        response = self.client.post(
            reverse('login'),
            data={'email': 'test@gmail.com', 'password': self.password}
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['success'], False)

    def test_login_failure_missing_fields(self):
        response = self.client.post(
            reverse('login'),
            data={'email': self.email}
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['success'], False)

    def test_logout_success(self):
        # Primero iniciamos sesión
        self.client.login(username=self.email, password=self.password)
        
        response = self.client.post(reverse('logout'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['success'], True)

    def test_logout_failure_anonymous(self):
        response = self.client.post(reverse('logout'))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['success'], False)

    def test_status_authenticated(self):
        # Simulamos sesión iniciada
        self.client.login(username=self.email, password=self.password)
        
        response = self.client.get(reverse('status'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['is_authenticated'], True)
        self.assertEqual(response.json()['user']['no_cuenta_v'], '20181234')

    def test_status_anonymous(self):
        response = self.client.get(reverse('status'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['is_authenticated'], False)
