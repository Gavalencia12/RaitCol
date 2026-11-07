import django.utils.timezone
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_remove_user_credential_udc_img_user_user_udc_img'),
    ]

    operations = [
        migrations.CreateModel(
            name='PasswordResetVerification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code_hash', models.CharField(max_length=128)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('attempts', models.PositiveSmallIntegerField(default=0)),
                ('verified_at', models.DateTimeField(blank=True, null=True)),
                ('user', models.OneToOneField(
                    db_column='user_id',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='password_reset_verification',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'password_reset_verification',
            },
        ),
    ]
