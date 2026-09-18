from django.urls import path
from . import views

urlpatterns = [
    path('car/register/', views.register_car_view, name='register_car'),
    path('api/journey/<int:journey_id>/', views.journey_detail_api, name='journey_detail_api'),
    path('api/journey/<int:journey_id>/update-location/', views.update_ride_location_api, name='update_ride_location_api'),
    path('api/journey/<int:journey_id>/reserve/', views.reserve_journey_api, name='reserve_journey_api'),
    path('api/journey/<int:journey_id>/cancel-reservation/', views.cancel_reservation_api, name='cancel_reservation_api'),
]
