import json
import logging
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.mail import send_mail
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import User, EmailVerification
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.forms import PasswordChangeForm
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.contrib import messages

logger = logging.getLogger(__name__)


# Create your views here.

def login_page(request):
    return render(request, 'users/login.html')

def register_view(request):
    return render(request, 'users/register.html')

def profile_view(request):
    if not request.user.is_authenticated:
        return redirect('login_page')
    return render(request, 'users/profile.html')
@login_required 
def change_pass_view(request):
    if request.method == 'POST':
        form = PasswordChangeForm(user=request.user, data=request.POST)
        if form.is_valid():
            user = form.save()
            update_session_auth_hash(request, user) # Mantiene la sesión abierta
             # Envío de correo de notificación de seguridad
            send_mail(
                subject='Notificación de Seguridad - Cambio de Contraseña en UniRide',
                message=f'Hola {user.first_name},\n\nTe notificamos que la contraseña de tu cuenta en RaitCol ha sido actualizada exitosamente.\nSi no realizaste este cambio, por favor ponte en contacto inmediatamente con soporte.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            # Agrega esta respuesta para JavaScript
            return JsonResponse({'success': True, 'message': '¡Tu contraseña ha sido actualizada con éxito y te hemos enviado un correo de confirmación!'})
        else:
            # Si el formulario no es válido, devuelve los errores en formato JSON
            return JsonResponse({'success': False, 'errors': form.errors.as_text()}, status=400)
            
    else:
        form = PasswordChangeForm(user=request.user)
    
    # ESTA LÍNEA ES CLAVE: Si falla el POST o es un GET, vuelve a pintar el formulario
    return render(request, 'users/change_password.html', {'form': form})
    
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
        try:
            inactive_user = User.objects.get(email=email)
            if not inactive_user.is_active:
                return JsonResponse({
                    'message': 'Tu cuenta no está activa. Por favor, verifica tu correo.',
                    'success': False,
                    'inactive': True,
                    'email': email
                }, status=403)
        except User.DoesNotExist:
            pass
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


@csrf_exempt
@require_http_methods(["POST"])
def register_user_api(request):
    data = {}
    if request.content_type == 'application/json':
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'message': 'JSON inválido', 'success': False}, status=400)
    else:
        data = request.POST

    first_name = data.get('first_name')
    last_name = data.get('last_name')
    username = data.get('username')
    email = data.get('email')
    no_cuenta_v = data.get('no_cuenta_v')
    password = data.get('password')

    if not all([first_name, last_name, username, email, no_cuenta_v, password]):
        return JsonResponse({'message': 'Todos los campos son obligatorios', 'success': False}, status=400)

    # Validar correo institucional
    if not email.endswith('@ucol.mx'):
        return JsonResponse({'message': 'El correo debe pertenecer al dominio institucional (@ucol.mx)', 'success': False}, status=400)

    # Validar duplicados
    if User.objects.filter(email=email).exists():
        return JsonResponse({'message': 'El correo ya está registrado', 'success': False}, status=400)

    if User.objects.filter(username=username).exists():
        return JsonResponse({'message': 'El nombre de usuario ya está en uso', 'success': False}, status=400)

    if User.objects.filter(no_cuenta_v=no_cuenta_v).exists():
        return JsonResponse({'message': 'El número de cuenta ya está registrado', 'success': False}, status=400)

    try:
        # Validar contraseña
        validate_password(password)
    except ValidationError as e:
        return JsonResponse({'message': '; '.join(e.messages), 'success': False}, status=400)

    try:
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            no_cuenta_v=no_cuenta_v,
            is_active=False
        )
    except Exception as e:
        logger.error(f"Error al crear usuario: {e}")
        return JsonResponse({'message': 'Error interno al crear el usuario', 'success': False}, status=500)

    # Generar código de verificación
    verification, created = EmailVerification.objects.get_or_create(user=user)
    verification.generate_code()

    # Enviar correo
    try:
        send_mail(
            subject='Verifica tu cuenta en UniRide',
            message=f'Hola {first_name},\n\nTu código de verificación para registrarte en UniRide es: {verification.code}\n\nEste código expirará en 15 minutos.',
            from_email=None,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception as e:
        logger.error(f"Error al enviar correo de verificación: {e}")
        print(f"\n======================================")
        print(f"CÓDIGO DE VERIFICACIÓN PARA {email}: {verification.code}")
        print(f"======================================\n")
        return JsonResponse({
            'message': 'Registro exitoso. No se pudo enviar el correo, pero puedes usar el código en consola.',
            'success': True,
            'email': email,
            'debug_code': verification.code
        }, status=201)

    return JsonResponse({
        'message': 'Registro exitoso. Se ha enviado un código de verificación a tu correo.',
        'success': True,
        'email': email
    }, status=201)


@csrf_exempt
@require_http_methods(["POST"])
def verify_code_api(request):
    data = {}
    if request.content_type == 'application/json':
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'message': 'JSON inválido', 'success': False}, status=400)
    else:
        data = request.POST

    email = data.get('email')
    code = data.get('code')

    if not email or not code:
        return JsonResponse({'message': 'El correo y el código son obligatorios', 'success': False}, status=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return JsonResponse({'message': 'Usuario no encontrado', 'success': False}, status=404)

    if user.is_active:
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        return JsonResponse({'message': 'Esta cuenta ya está activa. Iniciando sesión.', 'success': True, 'already_active': True}, status=200)

    try:
        verification = user.verification
    except EmailVerification.DoesNotExist:
        return JsonResponse({'message': 'No se encontró un código de verificación para este correo. Solicita uno nuevo.', 'success': False}, status=400)

    if verification.is_expired():
        return JsonResponse({'message': 'El código de verificación ha expirado. Solicita uno nuevo.', 'success': False, 'expired': True}, status=400)

    if verification.code != code:
        return JsonResponse({'message': 'El código de verificación es incorrecto', 'success': False}, status=400)

    # Activar usuario
    user.is_active = True
    user.save()
    verification.delete()

    login(request, user, backend='django.contrib.auth.backends.ModelBackend')

    return JsonResponse({
        'message': 'Cuenta verificada con éxito. Sesión iniciada.',
        'success': True,
        'user': {
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'no_cuenta_v': user.no_cuenta_v
        }
    }, status=200)


@csrf_exempt
@require_http_methods(["POST"])
def resend_code_api(request):
    data = {}
    if request.content_type == 'application/json':
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'message': 'JSON inválido', 'success': False}, status=400)
    else:
        data = request.POST

    email = data.get('email')

    if not email:
        return JsonResponse({'message': 'El correo es obligatorio', 'success': False}, status=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return JsonResponse({'message': 'Usuario no encontrado', 'success': False}, status=404)

    if user.is_active:
        return JsonResponse({'message': 'Esta cuenta ya está activa', 'success': True, 'already_active': True}, status=200)

    verification, created = EmailVerification.objects.get_or_create(user=user)
    verification.generate_code()

    # Enviar correo
    try:
        send_mail(
            subject='Nuevo código de verificación - UniRide',
            message=f'Hola {user.first_name},\n\nTu nuevo código de verificación es: {verification.code}\n\nEste código expirará en 15 minutos.',
            from_email=None,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception as e:
        logger.error(f"Error al reenviar correo de verificación: {e}")
        print(f"\n======================================")
        print(f"NUEVO CÓDIGO DE VERIFICACIÓN PARA {email}: {verification.code}")
        print(f"======================================\n")
        return JsonResponse({
            'message': 'Se ha generado un nuevo código de verificación (ver consola si falla SMTP).',
            'success': True,
            'email': email,
            'debug_code': verification.code
        }, status=200)

    return JsonResponse({
        'message': 'Se ha enviado un nuevo código de verificación a tu correo.',
        'success': True,
        'email': email
    }, status=200)

