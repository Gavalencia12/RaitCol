import json
from django.shortcuts import render
from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods


# Create your views here.

def login_page(request):
    return render(request, 'users/login.html')

def register_view(request):
    return render(request, 'users/register.html')
    
@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    email = None
    password = None
    
    # Soporta tanto payload JSON como parámetros POST normales de formulario
    if request.content_type == 'application/json':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')
        except json.JSONDecodeError:
            return JsonResponse({'message': 'JSON inválido', 'success': False}, status=400)
    else:
        email = request.POST.get('email')
        password = request.POST.get('password')
        
    if not email or not password:
        return JsonResponse({'message': 'El correo y la contraseña son obligatorios', 'success': False}, status=400)
        
    if not email.endswith('@ucol.mx'):
        return JsonResponse({'message': 'El correo debe pertenecer al dominio institucional (@ucol.mx)', 'success': False}, status=400)
        
    # El USERNAME_FIELD en el modelo personalizado User es 'email', por lo que pasamos el email en el parámetro 'username'
    user = authenticate(request, username=email, password=password)
    if user is not None:
        login(request, user)
        return JsonResponse({
            'message': 'Login exitoso',
            'success': True,
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'no_cuenta_v': user.no_cuenta_v
            }
        }, status=200)
    else:
        return JsonResponse({'message': 'Correo o contraseña incorrectos', 'success': False}, status=401)

@csrf_exempt
@require_http_methods(["POST"])
def logout_view(request):
    if request.user.is_authenticated:
        logout(request)
        return JsonResponse({
            'message': 'Logout exitoso',
            'success': True
        }, status=200)
    else:
        return JsonResponse({
            'message': 'No has iniciado sesión',
            'success': False
        }, status=400)

@require_http_methods(["GET"])
def status_view(request):
    if request.user.is_authenticated:
        return JsonResponse({
            'is_authenticated': True,
            'user': {
                'id': request.user.id,
                'email': request.user.email,
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
                'no_cuenta_v': request.user.no_cuenta_v
            }
        }, status=200)
    else:
        return JsonResponse({
            'is_authenticated': False
        }, status=200)
