from django import forms
from .models import User

class UserProfileForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'credential_udc_img']
        widgets = {
            'first_name': forms.TextInput(attrs={
                'class': 'form-control',
                'id': 'first_name',
                'placeholder': 'Tu nombre',
                'required': True
            }),
            'last_name': forms.TextInput(attrs={
                'class': 'form-control',
                'id': 'last_name',
                'placeholder': 'Tus apellidos',
                'required': True
            }),
            'credential_udc_img': forms.FileInput(attrs={
                'class': 'form-control',
                'id': 'credential_udc_img',
                'accept': 'image/*,.pdf'
            }),
        }
