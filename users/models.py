from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.exceptions import ValidationError

def validate_ucol_email(value):
    if not value.endswith("@ucol.mx"):
        raise ValidationError("El correo debe pertenecer al dominio institucional (@ucol.mx)")

class User(AbstractUser):
    first_name = models.CharField(max_length=100, db_column='name_user_v')
    last_name = models.CharField(max_length=100, db_column='last_name_v')
    email = models.EmailField(unique=True, validators=[validate_ucol_email], db_column='email_user_v')
    is_active = models.BooleanField(default=True, db_column='is_active_b')
    no_cuenta_v = models.CharField(max_length=10, unique=True, db_column='no_cuenta_v')
    date_create_t = models.DateTimeField(auto_now_add=True, db_column='date_create_t')
    date_update_t = models.DateTimeField(auto_now=True, db_column='date_update_t')

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name', 'no_cuenta_v']

    class Meta:
        db_table = 'user'

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.no_cuenta_v})"
