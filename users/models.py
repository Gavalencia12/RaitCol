import random
import string
from datetime import timedelta
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone

def validate_ucol_email(value):
    if not value.endswith("@ucol.mx"):
        raise ValidationError("El correo debe pertenecer al dominio institucional (@ucol.mx)")

class User(AbstractUser):
    first_name = models.CharField(max_length=100, db_column='name_user_v')
    last_name = models.CharField(max_length=100, db_column='last_name_v')
    email = models.EmailField(unique=True, validators=[validate_ucol_email], db_column='email_user_v')
    is_active = models.BooleanField(default=True, db_column='is_active_b')
    no_cuenta_v = models.CharField(max_length=10, unique=True, db_column='no_cuenta_v')
    credential_udc_img = models.FileField(upload_to='credentials/', null=True, blank=True, db_column='credential_udc_img')
    credential_udc_base64 = models.TextField(null=True, blank=True, db_column='credential_udc_base64')
    date_create_t = models.DateTimeField(auto_now_add=True, db_column='date_create_t')
    date_update_t = models.DateTimeField(auto_now=True, db_column='date_update_t')

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name', 'no_cuenta_v']

    class Meta:
        db_table = 'user'

    def get_credential_display(self):
        if self.credential_udc_base64:
            return self.credential_udc_base64
        if self.credential_udc_img:
            return self.credential_udc_img.url
        return None

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.no_cuenta_v})"

#Definicion de la tabla para el modelo de verificacion de correo
class EmailVerification(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='verification', db_column='user_id')
    code = models.CharField(max_length=6, db_column='code_v')
    created_at = models.DateTimeField(auto_now_add=True, db_column='created_at_t')

    class Meta:
        db_table = 'email_verification'

    def is_expired(self):
        # Expiración en 15 minutos
        return timezone.now() > self.created_at + timedelta(minutes=15)

    def generate_code(self):
        self.code = ''.join(random.choices(string.digits, k=6))
        self.created_at = timezone.now()  # Actualiza la fecha para reiniciar el temporizador de expiración
        self.save()

    def __str__(self):
        return f"Código {self.code} para {self.user.email}"

