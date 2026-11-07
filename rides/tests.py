import json
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from datetime import timedelta
from rides.models import (
    Address,
    Car,
    DriverModerationStatus,
    Journey,
    Report,
    Reservation,
    Route,
)
from rides.moderation import confirm_report, get_publication_restriction

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


class DriverModerationTestCase(TestCase):
    def setUp(self):
        self.driver = User.objects.create_user(
            username='moderated_driver',
            email='moderated_driver@ucol.mx',
            password='password123',
            first_name='Driver',
            last_name='Moderated',
            no_cuenta_v='20209991',
        )
        self.passenger = User.objects.create_user(
            username='moderation_passenger',
            email='moderation_passenger@ucol.mx',
            password='password123',
            first_name='Passenger',
            last_name='Test',
            no_cuenta_v='20209992',
        )
        self.car = Car.objects.create(
            id_user_car_i=self.driver,
            type_car_v='Sedan',
            mark_car_v='Nissan',
            model_car_v='Versa',
            year_car_i=2021,
            color_car_v='Azul',
            seating_car_i=4,
            plates_car_v='MOD-123',
        )
        self.origin = Address.objects.create(name_address_v='Origen', latitude_d=19.1, longitude_d=-104.3)
        self.destination = Address.objects.create(name_address_v='Destino', latitude_d=19.2, longitude_d=-104.4)
        self.route = Route.objects.create(
            id_address_origin_i=self.origin,
            id_address_destiny_i=self.destination,
        )

    def make_journey(self, status='finished', is_active=False):
        return Journey.objects.create(
            id_user_car_journey_i=self.car,
            id_route_journey_i=self.route,
            cost_journey_d=30,
            available_seats_i=3,
            status_v=status,
            is_active_b=is_active,
        )

    def make_report(self, status=Report.STATUS_PENDING):
        journey = self.make_journey()
        return Report.objects.create(
            id_journey_report_i=journey,
            id_reporter_i=self.passenger,
            id_reported_user_i=self.driver,
            reason_i=1,
            status=status,
        )

    def test_fourth_confirmed_report_suspends_publication_for_72_hours(self):
        for _ in range(3):
            self.make_report(status=Report.STATUS_CONFIRMED)
        pending_report = self.make_report()

        before_confirmation = timezone.now()
        confirmed, warnings_count = confirm_report(pending_report.pk, self.passenger)

        self.assertTrue(confirmed)
        self.assertEqual(warnings_count, 4)
        moderation_status = DriverModerationStatus.objects.get(user=self.driver)
        self.assertGreaterEqual(
            moderation_status.publish_suspended_until,
            before_confirmation + timedelta(hours=72),
        )
        self.assertTrue(get_publication_restriction(self.driver)['blocked'])

    def test_publication_is_allowed_after_suspension_if_fewer_than_six_reports(self):
        for _ in range(4):
            self.make_report(status=Report.STATUS_CONFIRMED)
        DriverModerationStatus.objects.create(
            user=self.driver,
            publish_suspended_until=timezone.now() - timedelta(seconds=1),
        )

        restriction = get_publication_restriction(self.driver)

        self.assertFalse(restriction['blocked'])
        self.assertEqual(restriction['warnings_count'], 4)

    def test_six_confirmed_reports_permanently_block_publication(self):
        for _ in range(6):
            self.make_report(status=Report.STATUS_CONFIRMED)
        DriverModerationStatus.objects.create(
            user=self.driver,
            publish_suspended_until=timezone.now() - timedelta(seconds=1),
        )

        restriction = get_publication_restriction(self.driver)

        self.assertTrue(restriction['blocked'])
        self.assertEqual(restriction['reason'], 'permanent')
        self.assertEqual(restriction['warnings_count'], 6)

    def test_pending_and_dismissed_reports_do_not_count(self):
        self.make_report(status=Report.STATUS_PENDING)
        self.make_report(status=Report.STATUS_DISMISSED)

        restriction = get_publication_restriction(self.driver)

        self.assertFalse(restriction['blocked'])
        self.assertEqual(restriction['warnings_count'], 0)

    def test_home_shows_different_badge_after_temporary_suspension_expires(self):
        for _ in range(4):
            self.make_report(status=Report.STATUS_CONFIRMED)
        DriverModerationStatus.objects.create(
            user=self.driver,
            publish_suspended_until=timezone.now() - timedelta(seconds=1),
        )
        self.make_journey(status='active', is_active=True)
        self.client.force_login(self.passenger)

        response = self.client.get(reverse('home'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Historial: 4 reportes')

    @patch('users.utils.send_custom_email')
    def test_report_api_only_accepts_the_actual_driver_from_a_passenger(self, send_email):
        journey = self.make_journey()
        Reservation.objects.create(
            id_journey_reservation_i=journey,
            id_user_passenger_reservation_i=self.passenger,
            price_user_pass_d=30,
        )
        self.client.force_login(self.passenger)
        response = self.client.post(
            reverse('report_user_api'),
            data=json.dumps({
                'report_ride_id': journey.pk,
                'report_user_id': self.passenger.pk,
                'report_reason': 1,
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Report.objects.filter(id_journey_report_i=journey).exists())

        response = self.client.post(
            reverse('report_user_api'),
            data=json.dumps({
                'report_ride_id': journey.pk,
                'report_user_id': self.driver.pk,
                'report_reason': 1,
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            Report.objects.get(id_journey_report_i=journey).status,
            Report.STATUS_PENDING,
        )
        send_email.assert_called_once()
        self.assertEqual(send_email.call_args.args[2], [self.driver.email])
        self.assertNotIn(self.passenger.email, send_email.call_args.args[1])

    def test_profile_shows_private_report_status_history(self):
        confirmed_report = self.make_report(status=Report.STATUS_CONFIRMED)
        pending_report = self.make_report(status=Report.STATUS_PENDING)
        self.client.force_login(self.driver)

        response = self.client.get(reverse('profile'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['confirmed_reports_count'], 1)
        self.assertEqual(response.context['pending_reports_count'], 1)
        self.assertContains(response, 'Estado de reportes de tus viajes')
        self.assertContains(response, 'Confirmado')
        self.assertContains(response, 'En revisión')
        self.assertIn(confirmed_report, response.context['received_reports'])
        self.assertIn(pending_report, response.context['received_reports'])

    def test_staff_email_links_to_the_internal_report_review_panel(self):
        journey = self.make_journey()
        Reservation.objects.create(
            id_journey_reservation_i=journey,
            id_user_passenger_reservation_i=self.passenger,
            price_user_pass_d=30,
        )
        moderator = User.objects.create_user(
            username='ride_moderator',
            email='moderator@ucol.mx',
            password='password123',
            no_cuenta_v='20209993',
            is_staff=True,
        )
        report_permission = Permission.objects.get(
            codename='change_report',
            content_type__app_label='rides',
        )
        moderator.user_permissions.add(report_permission)
        self.client.force_login(self.passenger)

        with patch('users.utils.send_custom_email') as send_email:
            response = self.client.post(
                reverse('report_user_api'),
                data=json.dumps({
                    'report_ride_id': journey.pk,
                    'report_user_id': self.driver.pk,
                    'report_reason': 1,
                }),
                content_type='application/json',
            )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.json()['moderators_notified'])
        moderator_call = send_email.call_args_list[1]
        self.assertEqual(moderator_call.args[2], [moderator.email])
        self.assertIn(
            'http://testserver/admin/rides/report/',
            moderator_call.kwargs['html_content'],
        )

    def test_driver_home_shows_active_reservation_count_and_management_action(self):
        journey = self.make_journey(status='active', is_active=True)
        Reservation.objects.create(
            id_journey_reservation_i=journey,
            id_user_passenger_reservation_i=self.passenger,
            price_user_pass_d=30,
        )
        self.client.force_login(self.driver)

        response = self.client.get(reverse('home'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '1 reserva')
        self.assertContains(response, 'Ver reservas y viaje')
        self.assertContains(response, 'Las reservaciones se confirman automáticamente')

    def test_only_the_driver_can_mark_an_active_passenger_as_picked_up(self):
        journey = self.make_journey(status='active', is_active=True)
        reservation = Reservation.objects.create(
            id_journey_reservation_i=journey,
            id_user_passenger_reservation_i=self.passenger,
            price_user_pass_d=30,
            is_active_b=True,
        )
        pickup_url = reverse(
            'mark_passenger_picked_up_api',
            kwargs={'journey_id': journey.pk, 'reservation_id': reservation.pk},
        )

        self.client.force_login(self.passenger)
        forbidden_response = self.client.post(pickup_url)
        self.assertEqual(forbidden_response.status_code, 403)

        self.client.force_login(self.driver)
        pickup_response = self.client.post(pickup_url)
        self.assertEqual(pickup_response.status_code, 200)
        self.assertTrue(pickup_response.json()['isPickedUp'])

        self.client.force_login(self.passenger)
        detail_response = self.client.get(
            reverse('journey_detail_api', kwargs={'journey_id': journey.pk}),
        )
        self.assertEqual(detail_response.status_code, 200)
        own_seat = next(
            seat for seat in detail_response.json()['seats']
            if seat['isCurrentUser']
        )
        self.assertTrue(own_seat['isPickedUp'])

    def test_permanently_blocked_driver_cannot_publish_new_journeys(self):
        self.driver.groups.add(Group.objects.create(name='Conductor'))
        for _ in range(6):
            self.make_report(status=Report.STATUS_CONFIRMED)
        existing_journey_count = Journey.objects.count()
        self.client.force_login(self.driver)

        response = self.client.post(reverse('home'), data={})

        self.assertRedirects(response, reverse('home'))
        self.assertEqual(Journey.objects.count(), existing_journey_count)

    @patch('users.utils.send_custom_email')
    def test_blocked_driver_journey_can_still_be_reserved(self, send_email):
        for _ in range(6):
            self.make_report(status=Report.STATUS_CONFIRMED)
        journey = Journey.objects.create(
            id_user_car_journey_i=self.car,
            id_route_journey_i=self.route,
            cost_journey_d=30,
            available_seats_i=3,
            status_v='active',
            is_active_b=True,
        )
        self.client.force_login(self.passenger)

        response = self.client.post(
            reverse('reserve_journey_api', kwargs={'journey_id': journey.pk}),
            data=json.dumps({}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['success'])
        self.assertTrue(Reservation.objects.filter(
            id_journey_reservation_i=journey,
            id_user_passenger_reservation_i=self.passenger,
            is_active_b=True,
        ).exists())
