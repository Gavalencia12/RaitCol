from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from .models import User, EmailVerification

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

    def test_register_user_success(self):
        response = self.client.post(
            reverse('register_api'),
            data={
                'first_name': 'Juan',
                'last_name': 'Perez',
                'username': 'juanperez',
                'email': 'juanperez@ucol.mx',
                'no_cuenta_v': '20191122',
                'password': 'StrongPassword123!'
            },
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['success'], True)
        
        user = User.objects.get(email='juanperez@ucol.mx')
        self.assertFalse(user.is_active)
        
        self.assertTrue(EmailVerification.objects.filter(user=user).exists())
        self.assertEqual(len(user.verification.code), 6)

    def test_register_user_non_ucol_email(self):
        response = self.client.post(
            reverse('register_api'),
            data={
                'first_name': 'Juan',
                'last_name': 'Perez',
                'username': 'juanperez',
                'email': 'juanperez@gmail.com',
                'no_cuenta_v': '20191122',
                'password': 'StrongPassword123!'
            },
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['success'], False)

    def test_register_user_duplicate_email(self):
        response = self.client.post(
            reverse('register_api'),
            data={
                'first_name': 'Duplicate',
                'last_name': 'User',
                'username': 'unique_uname',
                'email': self.email,  # already exists from setUp
                'no_cuenta_v': '20199999',
                'password': 'StrongPassword123!'
            },
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['success'], False)

    def test_verify_code_success(self):
        # Register a new user first
        user = User.objects.create_user(
            username='verify_me',
            email='verify@ucol.mx',
            password='testpassword123',
            first_name='Verify',
            last_name='User',
            no_cuenta_v='20193344',
            is_active=False
        )
        verification = EmailVerification.objects.create(user=user)
        verification.generate_code()
        
        response = self.client.post(
            reverse('verify_code_api'),
            data={
                'email': 'verify@ucol.mx',
                'code': verification.code
            },
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['success'], True)
        
        # User should be active now
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        
        # Verification code should be deleted
        self.assertFalse(EmailVerification.objects.filter(user=user).exists())

    def test_verify_code_incorrect(self):
        user = User.objects.create_user(
            username='verify_me',
            email='verify@ucol.mx',
            password='testpassword123',
            first_name='Verify',
            last_name='User',
            no_cuenta_v='20193344',
            is_active=False
        )
        verification = EmailVerification.objects.create(user=user)
        verification.generate_code()
        
        response = self.client.post(
            reverse('verify_code_api'),
            data={
                'email': 'verify@ucol.mx',
                'code': '000000'  # wrong code
            },
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['success'], False)
        
        # User should remain inactive
        user.refresh_from_db()
        self.assertFalse(user.is_active)

    def test_verify_code_expired(self):
        user = User.objects.create_user(
            username='verify_me',
            email='verify@ucol.mx',
            password='testpassword123',
            first_name='Verify',
            last_name='User',
            no_cuenta_v='20193344',
            is_active=False
        )
        # Forzar created_at en el pasado usando save()
        verification = EmailVerification.objects.create(user=user, code='123456')
        EmailVerification.objects.filter(id=verification.id).update(
            created_at=timezone.now() - timedelta(minutes=20)
        )
        
        response = self.client.post(
            reverse('verify_code_api'),
            data={
                'email': 'verify@ucol.mx',
                'code': '123456'
            },
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['success'], False)
        self.assertEqual(response.json().get('expired'), True)

    def test_resend_code(self):
        user = User.objects.create_user(
            username='verify_me',
            email='verify@ucol.mx',
            password='testpassword123',
            first_name='Verify',
            last_name='User',
            no_cuenta_v='20193344',
            is_active=False
        )
        verification = EmailVerification.objects.create(user=user)
        verification.generate_code()
        old_code = verification.code
        
        response = self.client.post(
            reverse('resend_code_api'),
            data={'email': 'verify@ucol.mx'},
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['success'], True)
        
        verification.refresh_from_db()
        # Code should have changed
        self.assertNotEqual(verification.code, old_code)
