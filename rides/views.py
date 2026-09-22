import base64
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import Group
from django.contrib import messages
from .models import Journey, Car, Reservation, Address, Route
from .forms import CarForm

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

# Create your views here.
@login_required(login_url='login_page')
def home(request):
    user_cars = Car.objects.filter(id_user_car_i=request.user, is_active_b=True)
    has_car = user_cars.exists()
    is_driver = request.user.groups.filter(name='Conductor').exists() or has_car

    if request.method == 'POST':
        if not has_car:
            messages.error(request, "Lo sentimos, necesitas registrar un vehículo en tu perfil antes de publicar un viaje.")
            return redirect('profile')

        origen_name = request.POST.get('origen', '').strip()
        destino_name = request.POST.get('destino', '').strip()
        horario = request.POST.get('horario', '').strip()
        
        try:
            asientos = int(request.POST.get('asientos', 3))
        except (ValueError, TypeError):
            asientos = 3

        try:
            precio = float(request.POST.get('precio', 25))
        except (ValueError, TypeError):
            precio = 25.0

        if not origen_name or not destino_name:
            messages.error(request, "Por favor proporciona un origen y destino válidos.")
            return redirect('home')

        # Coordenadas enviadas por el mapa/GPS (o fallbacks por defecto)
        try:
            orig_lat = float(request.POST.get('origen_lat')) if request.POST.get('origen_lat') else 19.1158
            orig_lng = float(request.POST.get('origen_lng')) if request.POST.get('origen_lng') else -104.3308
        except (ValueError, TypeError):
            orig_lat, orig_lng = 19.1158, -104.3308

        try:
            dest_lat = float(request.POST.get('destino_lat')) if request.POST.get('destino_lat') else 19.1170
            dest_lng = float(request.POST.get('destino_lng')) if request.POST.get('destino_lng') else -104.3985
        except (ValueError, TypeError):
            dest_lat, dest_lng = 19.1170, -104.3985

        origin_address = Address.objects.create(
            name_address_v=origen_name,
            hour_init_t=horario if horario else None,
            latitude_d=orig_lat,
            longitude_d=orig_lng,
            is_active_b=True
        )

        dest_address = Address.objects.create(
            name_address_v=destino_name,
            latitude_d=dest_lat,
            longitude_d=dest_lng,
            is_active_b=True
        )

        route = Route.objects.create(
            id_address_origin_i=origin_address,
            id_address_destiny_i=dest_address,
            is_active_b=True
        )

        driver_car = user_cars.first()
        Journey.objects.create(
            id_user_car_journey_i=driver_car,
            id_route_journey_i=route,
            id_address_journey_i=origin_address,
            cost_journey_d=precio,
            available_seats_i=asientos,
            status_v='active',
            is_active_b=True
        )

        messages.success(request, "¡Tu viaje ha sido publicado exitosamente y ya aparece en la lista!")
        return redirect('home')

    viajes_qs = Journey.objects.filter(
        is_active_b=True, 
        status_v='active',
        id_user_car_journey_i__is_active_b=True,
        id_user_car_journey_i__id_user_car_i__is_active=True,
        id_route_journey_i__is_active_b=True,
        id_route_journey_i__id_address_origin_i__is_active_b=True,
        id_route_journey_i__id_address_destiny_i__is_active_b=True
    ).select_related(
        'id_user_car_journey_i', 
        'id_user_car_journey_i__id_user_car_i',
        'id_route_journey_i__id_address_origin_i', 
        'id_route_journey_i__id_address_destiny_i'
    )

    user_reservations = set(
        Reservation.objects.filter(
            id_user_passenger_reservation_i=request.user,
            is_active_b=True
        ).values_list('id_journey_reservation_i_id', flat=True)
    )

    for viaje in viajes_qs:
        driver_user = viaje.id_user_car_journey_i.id_user_car_i
        viaje.is_driver = (request.user.id == driver_user.id)
        viaje.is_passenger = (viaje.id_journey_i in user_reservations)

        if viaje.is_driver:
            viaje.role_btn_class = 'btn-role-driver'
            viaje.role_btn_text = 'Gestionar mi Viaje'
            viaje.role_icon = 'fas fa-sliders'
        elif viaje.is_passenger:
            viaje.role_btn_class = 'btn-role-passenger'
            viaje.role_btn_text = 'Rastrear en Vivo'
            viaje.role_icon = 'fas fa-location-dot'
        else:
            viaje.role_btn_class = 'btn-role-visitor'
            viaje.role_btn_text = 'Ver Detalle / Reservar'
            viaje.role_icon = 'fas fa-ticket'

    user_cars = Car.objects.filter(id_user_car_i=request.user, is_active_b=True)
    has_car = user_cars.exists()
    is_driver = request.user.groups.filter(name='Conductor').exists() or has_car

    context = {
        'viajes': viajes_qs,
        'mapbox_access_token': getattr(settings, 'MAPBOX_ACCESS_TOKEN', ''),
        'has_car': has_car,
        'is_driver': is_driver,
        'user_cars': user_cars,
    }
    return render(request, "home.html", context)

@login_required(login_url='login_page')
def journey_detail_api(request, journey_id):
    journey = Journey.objects.filter(
        pk=journey_id,
        is_active_b=True,
        status_v='active',
        id_user_car_journey_i__is_active_b=True,
        id_user_car_journey_i__id_user_car_i__is_active=True
    ).select_related(
        'id_user_car_journey_i__id_user_car_i',
        'id_route_journey_i__id_address_origin_i',
        'id_route_journey_i__id_address_destiny_i'
    ).first()

    if not journey:
        return JsonResponse({'error': 'Viaje no encontrado o inactivo'}, status=404)

    driver = journey.id_user_car_journey_i.id_user_car_i
    car = journey.id_user_car_journey_i
    route = journey.id_route_journey_i
    origin = route.id_address_origin_i
    dest = route.id_address_destiny_i

    is_driver = (request.user.id == driver.id)
    is_passenger = Reservation.objects.filter(
        id_journey_reservation_i=journey,
        id_user_passenger_reservation_i=request.user,
        is_active_b=True
    ).exists()
    is_visitor = not is_driver and not is_passenger

    passengers_qs = Reservation.objects.filter(
        id_journey_reservation_i=journey,
        is_active_b=True
    ).select_related('id_user_passenger_reservation_i')

    passengers_count = passengers_qs.count()
    offered_seats = journey.available_seats_i + passengers_count
    total_seats = offered_seats if offered_seats > 0 else (car.seating_car_i or 4)

    res_by_seat = {}
    unassigned_reservations = []
    for res in passengers_qs:
        if res.seat_number_i and 1 <= res.seat_number_i <= total_seats:
            res_by_seat[res.seat_number_i] = res
        else:
            unassigned_reservations.append(res)

    seats_list = []
    for s in range(1, total_seats + 1):
        res = res_by_seat.get(s)
        if not res and unassigned_reservations:
            res = unassigned_reservations.pop(0)
            res.seat_number_i = s
            res.save()

        if res:
            passenger = res.id_user_passenger_reservation_i
            p_name = f"{passenger.first_name} {passenger.last_name}".strip() or passenger.username
            seats_list.append({
                'seatNumber': s,
                'isTaken': True,
                'passengerId': passenger.id,
                'passengerName': p_name,
                'passengerAccount': getattr(passenger, 'no_cuenta_v', ''),
                'isCurrentUser': (passenger.id == request.user.id)
            })
        else:
            seats_list.append({
                'seatNumber': s,
                'isTaken': False,
                'passengerId': None,
                'passengerName': None,
                'passengerAccount': None,
                'isCurrentUser': False
            })

    driver_lat = float(journey.id_address_journey_i.latitude_d) if journey.id_address_journey_i else float(origin.latitude_d)
    driver_lng = float(journey.id_address_journey_i.longitude_d) if journey.id_address_journey_i else float(origin.longitude_d)

    return JsonResponse({
        'id': journey.id_journey_i,
        'routeId': route.id_route_i,
        'polyline': route.map_polyline_v or '',
        'driverId': driver.id,
        'isDriver': is_driver,
        'isPassenger': is_passenger,
        'isVisitor': is_visitor,
        'currentUserId': request.user.id,
        'driverName': f"{driver.first_name} {driver.last_name} ({driver.no_cuenta_v})",
        'driverEmail': driver.email,
        'carModel': f"{car.mark_car_v} {car.model_car_v}",
        'carMark': car.mark_car_v,
        'carColor': car.color_car_v,
        'carPlates': car.plates_car_v,
        'totalSeats': total_seats,
        'seats': seats_list,
        'cost': float(journey.cost_journey_d),
        'availableSeats': journey.available_seats_i,
        'passengersCount': passengers_count,
        'origin': origin.name_address_v,
        'originLat': float(origin.latitude_d),
        'originLng': float(origin.longitude_d),
        'destination': dest.name_address_v,
        'destLat': float(dest.latitude_d),
        'destLng': float(dest.longitude_d),
        'driverLat': driver_lat,
        'driverLng': driver_lng,
    })

@csrf_exempt
@login_required(login_url='login_page')
@require_http_methods(["POST"])
def reserve_journey_api(request, journey_id):
    """ API backend para reservar un lugar en un viaje """
    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    journey = Journey.objects.filter(pk=journey_id, is_active_b=True, status_v='active').first()
    if not journey:
        return JsonResponse({'success': False, 'message': 'El viaje no existe o ya no está activo.'}, status=404)

    driver = journey.id_user_car_journey_i.id_user_car_i
    if request.user.id == driver.id:
        return JsonResponse({'success': False, 'message': 'Eres el conductor de este viaje, no puedes reservarte a ti mismo.'}, status=400)

    if journey.available_seats_i <= 0:
        return JsonResponse({'success': False, 'message': 'Lo sentimos, este viaje ya no cuenta con asientos disponibles.'}, status=400)

    existing_reservation = Reservation.objects.filter(
        id_journey_reservation_i=journey,
        id_user_passenger_reservation_i=request.user,
        is_active_b=True
    ).first()

    if existing_reservation:
        return JsonResponse({'success': False, 'message': 'Ya cuentas con una reserva activa para este viaje.'}, status=400)

    requested_seat = data.get('seat_number')
    total_seats = journey.id_user_car_journey_i.seating_car_i or 4

    if requested_seat:
        try:
            requested_seat = int(requested_seat)
            if requested_seat < 1 or requested_seat > total_seats:
                return JsonResponse({'success': False, 'message': f'Número de asiento inválido (Debe ser entre 1 y {total_seats}).'}, status=400)
            
            seat_occupied = Reservation.objects.filter(
                id_journey_reservation_i=journey,
                seat_number_i=requested_seat,
                is_active_b=True
            ).exists()
            if seat_occupied:
                return JsonResponse({'success': False, 'message': f'El asiento #{requested_seat} ya se encuentra reservado por otra persona.'}, status=400)
        except (ValueError, TypeError):
            requested_seat = None

    # Si no especificó asiento, asignar automáticamente el primer asiento libre disponible
    if not requested_seat:
        taken_seats = set(Reservation.objects.filter(
            id_journey_reservation_i=journey,
            is_active_b=True,
            seat_number_i__isnull=False
        ).values_list('seat_number_i', flat=True))
        for s in range(1, total_seats + 1):
            if s not in taken_seats:
                requested_seat = s
                break

    # Crear reserva y actualizar asientos disponibles
    Reservation.objects.create(
        id_journey_reservation_i=journey,
        id_user_passenger_reservation_i=request.user,
        seat_number_i=requested_seat,
        price_user_pass_d=journey.cost_journey_d,
        is_active_b=True
    )

    journey.available_seats_i = max(0, journey.available_seats_i - 1)
    journey.save()

    return JsonResponse({
        'success': True,
        'message': f'¡Reserva del Asiento #{requested_seat} realizada exitosamente!',
        'reservedSeatNumber': requested_seat,
        'availableSeats': journey.available_seats_i
    })

@csrf_exempt
@login_required(login_url='login_page')
@require_http_methods(["POST"])
def cancel_reservation_api(request, journey_id):
    """ API backend para cancelar una reserva de viaje existente """
    reservation = Reservation.objects.filter(
        id_journey_reservation_i_id=journey_id,
        id_user_passenger_reservation_i=request.user,
        is_active_b=True
    ).first()

    if not reservation:
        return JsonResponse({'success': False, 'message': 'No se encontró una reserva activa para cancelar.'}, status=404)

    reservation.is_active_b = False
    reservation.save()

    journey = reservation.id_journey_reservation_i
    journey.available_seats_i += 1
    journey.save()

    return JsonResponse({
        'success': True,
        'message': 'Tu reserva ha sido cancelada exitosamente.',
        'availableSeats': journey.available_seats_i
    })

from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

@csrf_exempt
@login_required(login_url='login_page')
@require_http_methods(["POST"])
def update_ride_location_api(request, journey_id):
    """ Guarda permanentemente en la base de datos MySQL las coordenadas en vivo del conductor, origen/destino y la ruta """
    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    journey = Journey.objects.filter(
        pk=journey_id,
        is_active_b=True
    ).select_related(
        'id_route_journey_i__id_address_origin_i',
        'id_route_journey_i__id_address_destiny_i'
    ).first()

    if not journey:
        return JsonResponse({'success': False, 'message': 'Viaje no encontrado'}, status=404)

    route = journey.id_route_journey_i
    origin = route.id_address_origin_i
    dest = route.id_address_destiny_i

    updated = False

    # Actualización de posición del conductor en vivo (mantiene el origen de la ruta fijo)
    if 'driver_lat' in data and 'driver_lng' in data:
        try:
            d_lat = float(data['driver_lat'])
            d_lng = float(data['driver_lng'])
            if journey.id_address_journey_i:
                journey.id_address_journey_i.latitude_d = d_lat
                journey.id_address_journey_i.longitude_d = d_lng
                journey.id_address_journey_i.save()
            else:
                current_loc = Address.objects.create(
                    name_address_v="Ubicación Conductor En Vivo",
                    latitude_d=d_lat,
                    longitude_d=d_lng,
                    is_active_b=True
                )
                journey.id_address_journey_i = current_loc
                journey.save()
            updated = True
        except (ValueError, TypeError):
            pass

    if 'origin_lat' in data and 'origin_lng' in data:
        origin.latitude_d = float(data['origin_lat'])
        origin.longitude_d = float(data['origin_lng'])
        origin.save()
        updated = True

    if 'dest_lat' in data and 'dest_lng' in data:
        dest.latitude_d = float(data['dest_lat'])
        dest.longitude_d = float(data['dest_lng'])
        dest.save()
        updated = True

    if 'polyline' in data:
        route.map_polyline_v = str(data['polyline'])
        route.save()
        updated = True

    if updated:
        return JsonResponse({
            'success': True,
            'message': 'Ubicación del viaje guardada en MySQL',
            'originLat': float(origin.latitude_d),
            'originLng': float(origin.longitude_d),
            'destLat': float(dest.latitude_d),
            'destLng': float(dest.longitude_d),
            'polyline': route.map_polyline_v or ''
        }, status=200)
    else:
        return JsonResponse({'success': False, 'message': 'No se enviaron coordenadas o datos válidos'}, status=400)

#------------------------------------

@login_required(login_url='login_page')
def register_car_view(request):
    if request.method == 'POST':
        car_id = request.POST.get('car_id')
        existing_car = None
        if car_id and car_id != 'new':
            existing_car = Car.objects.filter(pk=car_id, id_user_car_i=request.user, is_active_b=True).first()
        elif not car_id:
            existing_car = Car.objects.filter(id_user_car_i=request.user, is_active_b=True).first()

        if existing_car:
            form = CarForm(request.POST, request.FILES, instance=existing_car)
        else:
            form = CarForm(request.POST, request.FILES)

        if form.is_valid():
            car = form.save(commit=False)
            car.id_user_car_i = request.user
            car.is_active_b = True

            uploaded_file = request.FILES.get('lic_user_car_v')
            if uploaded_file:
                content_type = uploaded_file.content_type or 'image/png'
                file_bytes = uploaded_file.read()
                uploaded_file.seek(0)
                base64_encoded = base64.b64encode(file_bytes).decode('utf-8')
                car.lic_user_car_base64 = f"data:{content_type};base64,{base64_encoded}"
            elif request.POST.get('lic_user_car_base64'):
                car.lic_user_car_base64 = request.POST.get('lic_user_car_base64')

            car.save()
            form.save_m2m()

            conductor_group, _ = Group.objects.get_or_create(name='Conductor')
            request.user.groups.add(conductor_group)

            msg = "¡Tu vehículo ha sido actualizado!" if existing_car else "¡Tu nuevo vehículo ha sido registrado exitosamente!"
            messages.success(request, msg)
            return redirect('profile')
        else:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"{error}")
            return redirect('profile')
    else:
        return redirect('profile')


