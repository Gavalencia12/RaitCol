import base64
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import Group
from django.contrib import messages
from .models import Journey, Car
from .forms import CarForm


# Create your views here.
@login_required(login_url='login_page')
def home(request):
    ## 2. Consultar los viajes activos
    viajes = Journey.objects.filter(
    is_active_b=True, 
    status_v='active'
    ).select_related(
    'id_user_car_journey_i', 
    'id_route_journey_i__id_address_origin_i', 
    'id_route_journey_i__id_address_destiny_i'
    )
    # 3. Añadir el listado al diccionario context
    viajes = {'viajes': viajes}
    return render(request, "home.html", viajes)
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


