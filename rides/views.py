from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from .models import Journey  # 1. Importar el modelo Journey


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

