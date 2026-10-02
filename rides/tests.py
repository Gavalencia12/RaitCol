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

from rides.utils import haversine_distance_km, min_distance_to_polyline_km, is_journey_near_passenger

class ProximityFilterTestCase(TestCase):
    def test_haversine_distance_calculation(self):
        # Manzanillo centro (19.0522, -104.3158) a El Naranjo UCol (19.1170, -104.3985) ~ 11.2 km
        dist = haversine_distance_km(19.0522, -104.3158, 19.1170, -104.3985)
        self.assertTrue(9.0 < dist < 14.0)

    def test_min_distance_to_polyline(self):
        # Polyline simple: punto A a punto B
        polyline_json = '[[-104.3308, 19.1158], [-104.3985, 19.1170]]'
        
        # Pasajero cerca del punto medio de la ruta (-104.3600, 19.1164)
        dist_middle = min_distance_to_polyline_km(19.1164, -104.3600, polyline_json)
        self.assertTrue(dist_middle < 0.5)

        dist_far = min_distance_to_polyline_km(19.2433, -103.7247, polyline_json)
        self.assertTrue(dist_far > 50.0)

from rides.models import Journey, Route, Address, Car

class FinishRideTestCase(TestCase):
    def setUp(self):
        self.driver_user = User.objects.create_user(
            username='driver_finish', email='driver_finish@ucol.mx', password='password123', no_cuenta_v='20209988'
        )
        self.other_user = User.objects.create_user(
            username='other_user', email='other@ucol.mx', password='password123', no_cuenta_v='20209989'
        )
        self.car = Car.objects.create(
            id_user_car_i=self.driver_user, type_car_v='Sedan', mark_car_v='Nissan',
            model_car_v='Versa', year_car_i=2021, color_car_v='Azul', seating_car_i=4, plates_car_v='XYZ-987'
        )
        self.origin = Address.objects.create(name_address_v='Origen', latitude_d=19.1, longitude_d=-104.3)
        self.dest = Address.objects.create(name_address_v='Destino', latitude_d=19.2, longitude_d=-104.4)
        self.route = Route.objects.create(id_address_origin_i=self.origin, id_address_destiny_i=self.dest)
        self.journey = Journey.objects.create(
            id_user_car_journey_i=self.car, id_route_journey_i=self.route, cost_journey_d=30,
            available_seats_i=3, status_v='active', is_active_b=True
        )

    def test_finish_ride_by_driver_success(self):
        self.client.login(username='driver_finish@ucol.mx', password='password123')
        url = reverse('finish_ride_api', kwargs={'journey_id': self.journey.id_journey_i})
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['success'])

        self.journey.refresh_from_db()
        self.assertEqual(self.journey.status_v, 'finished')
        self.assertFalse(self.journey.is_active_b)

    def test_finish_ride_by_non_driver_forbidden(self):
        self.client.login(username='other@ucol.mx', password='password123')
        url = reverse('finish_ride_api', kwargs={'journey_id': self.journey.id_journey_i})
        response = self.client.post(url)
        self.assertEqual(response.status_code, 403)
        self.assertFalse(response.json()['success'])

