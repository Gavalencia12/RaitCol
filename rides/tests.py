from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.uploadedfile import SimpleUploadedFile
from rides.models import Car

User = get_user_model()

class CarRegistrationTestCase(TestCase):
    def setUp(self):
        self.email = 'driver@ucol.mx'
        self.password = 'password123'
        self.user = User.objects.create_user(
            username='driveruser',
            email=self.email,
            password=self.password,
            first_name='Carlos',
            last_name='Driver',
            no_cuenta_v='20201122'
        )

    def test_register_car_unauthenticated(self):
        dummy_file = SimpleUploadedFile("licencia.jpg", b"file_content", content_type="image/jpeg")
        response = self.client.post(reverse('register_car'), data={
            'type_car_v': 'Sedán',
            'mark_car_v': 'Nissan',
            'model_car_v': 'Versa',
            'year_car_i': 2022,
            'color_car_v': 'Gris',
            'seating_car_i': 4,
            'plates_car_v': 'FGR-123',
            'lic_user_car_v': dummy_file
        })
        self.assertEqual(response.status_code, 302)
        self.assertIn('/login/', response.url)

    def test_register_car_without_license_fails(self):
        self.client.login(username=self.email, password=self.password)
        response = self.client.post(reverse('register_car'), data={
            'type_car_v': 'Sedán',
            'mark_car_v': 'Nissan',
            'model_car_v': 'Versa',
            'year_car_i': 2022,
            'color_car_v': 'Gris',
            'seating_car_i': 4,
            'plates_car_v': 'FGR-123',
            # Sin licencia
        })
        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('profile'))
        # No se crea el auto ni se asigna el rol
        self.assertFalse(Car.objects.filter(id_user_car_i=self.user).exists())
        self.assertFalse(self.user.groups.filter(name='Conductor').exists())

    def test_register_car_post_success(self):
        self.client.login(username=self.email, password=self.password)
        dummy_file = SimpleUploadedFile("licencia.jpg", b"file_content", content_type="image/jpeg")
        response = self.client.post(reverse('register_car'), data={
            'type_car_v': 'Sedán',
            'mark_car_v': 'Nissan',
            'model_car_v': 'Versa',
            'year_car_i': 2022,
            'color_car_v': 'Gris',
            'seating_car_i': 4,
            'plates_car_v': 'FGR-123',
            'lic_user_car_v': dummy_file
        })
        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('profile'))

        # Verificamos que el auto fue registrado
        car = Car.objects.filter(id_user_car_i=self.user, is_active_b=True).first()
        self.assertIsNotNone(car)
        self.assertEqual(car.mark_car_v, 'Nissan')
        self.assertEqual(car.model_car_v, 'Versa')

        # Verificamos que el usuario se haya añadido al grupo 'Conductor'
        self.assertTrue(self.user.groups.filter(name='Conductor').exists())

    def test_update_existing_car_post_success(self):
        self.client.login(username=self.email, password=self.password)
        dummy_file = SimpleUploadedFile("licencia_old.jpg", b"file_content", content_type="image/jpeg")
        # Crear auto inicial
        car = Car.objects.create(
            id_user_car_i=self.user,
            type_car_v='Sedán',
            mark_car_v='Nissan',
            model_car_v='Versa',
            year_car_i=2020,
            color_car_v='Blanco',
            seating_car_i=4,
            plates_car_v='OLD-123',
            lic_user_car_v=dummy_file
        )

        response = self.client.post(reverse('register_car'), data={
            'type_car_v': 'Sedán',
            'mark_car_v': 'Nissan',
            'model_car_v': 'Sentra',
            'year_car_i': 2023,
            'color_car_v': 'Negro',
            'seating_car_i': 5,
            'plates_car_v': 'NEW-999'
        })
        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('profile'))

        car.refresh_from_db()
        self.assertEqual(car.model_car_v, 'Sentra')
        self.assertEqual(car.year_car_i, 2023)
        self.assertEqual(car.plates_car_v, 'NEW-999')
