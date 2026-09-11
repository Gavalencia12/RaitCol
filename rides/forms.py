from django import forms
from .models import Car
from datetime import datetime

class CarForm(forms.ModelForm):
    class Meta:
        model = Car
        fields = [
            'type_car_v',
            'mark_car_v',
            'model_car_v',
            'year_car_i',
            'color_car_v',
            'seating_car_i',
            'plates_car_v',
            'lic_user_car_v',
        ]
        widgets = {
            'type_car_v': forms.TextInput(attrs={'class': 'form-control', 'id': 'type_car_v', 'placeholder': 'Ej. Sedán, Hatchback, SUV'}),
            'mark_car_v': forms.TextInput(attrs={'class': 'form-control', 'id': 'mark_car_v', 'placeholder': 'Ej. Nissan, Toyota'}),
            'model_car_v': forms.TextInput(attrs={'class': 'form-control', 'id': 'model_car_v', 'placeholder': 'Ej. Versa, Corolla'}),
            'year_car_i': forms.NumberInput(attrs={'class': 'form-control', 'id': 'year_car_i', 'placeholder': 'Ej. 2022'}),
            'color_car_v': forms.TextInput(attrs={'class': 'form-control', 'id': 'color_car_v', 'placeholder': 'Ej. Gris, Blanco'}),
            'seating_car_i': forms.NumberInput(attrs={'class': 'form-control', 'id': 'seating_car_i', 'placeholder': 'Ej. 4'}),
            'plates_car_v': forms.TextInput(attrs={'class': 'form-control', 'id': 'plates_car_v', 'placeholder': 'Ej. FGR-123'}),
            'lic_user_car_v': forms.FileInput(attrs={'class': 'form-control', 'id': 'lic_user_car_v', 'accept': 'image/*,.pdf'}),
        }

    def clean_year_car_i(self):
        year = self.cleaned_data.get('year_car_i')
        current_year = datetime.now().year + 1
        if year is not None and (year < 1950 or year > current_year):
            raise forms.ValidationError(f"Por favor ingresa un año de vehículo válido (entre 1950 y {current_year}).")
        return year

    def clean_seating_car_i(self):
        seating = self.cleaned_data.get('seating_car_i')
        if seating is not None and (seating < 1 or seating > 20):
            raise forms.ValidationError("La cantidad de asientos debe estar entre 1 y 20.")
        return seating

    def clean_lic_user_car_v(self):
        lic_file = self.cleaned_data.get('lic_user_car_v')
        has_existing_lic = bool(
            (self.instance and self.instance.pk and (self.instance.lic_user_car_v or self.instance.lic_user_car_base64)) or
            self.data.get('lic_user_car_base64')
        )
        if not lic_file and not has_existing_lic:
            raise forms.ValidationError("Es obligatorio subir la foto o archivo de tu licencia de conducir para registrar un vehículo y ser Conductor.")
        return lic_file

