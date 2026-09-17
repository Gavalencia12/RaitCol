# Generated manually to ensure real coordinates in database for Address records
from django.db import migrations

def update_real_address_coordinates(apps, schema_editor):
    Address = apps.get_model('rides', 'Address')
    
    # Actualizar jazmin #1011 con las coordenadas reales de Barrio 1 / Av. Elías Zamora (X roja)
    Address.objects.filter(name_address_v__icontains='jazmin').update(
        latitude_d=19.115800000000,
        longitude_d=-104.330800000000
    )
    
    # Actualizar FIE Manzanillo con las coordenadas reales del Campus El Naranjo en Mapbox
    Address.objects.filter(name_address_v__icontains='FIE').update(
        latitude_d=19.117000000000,
        longitude_d=-104.398500000000
    )

def reverse_update(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('rides', '0004_car_lic_user_car_base64'),
    ]

    operations = [
        migrations.RunPython(update_real_address_coordinates, reverse_update),
    ]
