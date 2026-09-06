from django.urls import path
from . import views

urlpatterns = [
    path('car/register/', views.register_car_view, name='register_car'),
]
