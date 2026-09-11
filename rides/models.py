from django.db import models
from django.conf import settings

class Address(models.Model):
    id_address_i = models.AutoField(primary_key=True, db_column='id_address_i')
    name_address_v = models.CharField(max_length=100, db_column='name_address_v')
    hour_init_t = models.TimeField(null=True, blank=True, db_column='hour_init_t')
    latitude_d = models.DecimalField(max_digits=18, decimal_places=12, db_column='latitude_d')
    longitude_d = models.DecimalField(max_digits=18, decimal_places=12, db_column='longitude_d')
    date_create_t = models.DateTimeField(auto_now_add=True, db_column='date_create_t')
    date_update_t = models.DateTimeField(auto_now=True, db_column='date_update_t')
    is_active_b = models.BooleanField(default=True, db_column='is_active_b')

    class Meta:
        db_table = 'address'
    
    def __str__(self):
        return self.name_address_v

class Car(models.Model):
    id_car_i = models.AutoField(primary_key=True, db_column='id_car_i')
    id_user_car_i = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column='id_user_car_i')
    type_car_v = models.CharField(max_length=50, db_column='type_car_v')
    mark_car_v = models.CharField(max_length=50, db_column='mark_car_v')
    model_car_v = models.CharField(max_length=50, db_column='model_car_v')
    year_car_i = models.IntegerField(db_column='year_car_i')
    color_car_v = models.CharField(max_length=50, db_column='color_car_v')
    seating_car_i = models.IntegerField(db_column='seating_car_i')
    plates_car_v = models.CharField(max_length=50, db_column='plates_car_v')
    lic_user_car_v = models.FileField(upload_to='licenses/', max_length=255, null=True, blank=True, db_column='lic_user_car_v')
    lic_user_car_base64 = models.TextField(null=True, blank=True, db_column='lic_user_car_base64')
    date_create_t = models.DateTimeField(auto_now_add=True, db_column='date_create_t')
    date_update_t = models.DateTimeField(auto_now=True, db_column='date_update_t')
    is_active_b = models.BooleanField(default=True, db_column='is_active_b')
    
    class Meta:
        db_table = 'car'

    def get_licence_display(self):
        if self.lic_user_car_base64:
            return self.lic_user_car_base64
        if self.lic_user_car_v:
            return self.lic_user_car_v.url
        return None
    
    def __str__(self):
        return f"{self.mark_car_v} {self.model_car_v} ({self.plates_car_v})"

class Route(models.Model):
    id_route_i = models.AutoField(primary_key=True, db_column='id_route_i')
    id_address_origin_i = models.ForeignKey(Address, on_delete=models.CASCADE, related_name='routes_origin', db_column='id_address_origin_i')
    id_address_destiny_i = models.ForeignKey(Address, on_delete=models.CASCADE, related_name='routes_destination', db_column='id_address_destiny_i')
    map_polyline_v = models.TextField(null=True, blank=True, db_column='map_polyline_v')
    time_route_t = models.TimeField(null=True, blank=True, db_column='time_route_t')
    date_create_t = models.DateTimeField(auto_now_add=True, db_column='date_create_t')
    date_update_t = models.DateTimeField(auto_now=True, db_column='date_update_t')
    is_active_b = models.BooleanField(default=True, db_column='is_active_b')

    class Meta:
        db_table = 'route'
    
    def __str__(self):
        return f"Ruta {self.id_route_i}: {self.id_address_origin_i} -> {self.id_address_destiny_i}"

class Journey(models.Model):
    id_journey_i = models.AutoField(primary_key=True, db_column='id_journey_i')
    id_user_car_journey_i = models.ForeignKey(Car, on_delete=models.CASCADE, db_column='id_user_car_journey_i')
    id_route_journey_i = models.ForeignKey(Route, on_delete=models.CASCADE, db_column='id_route_journey_i')
    id_address_journey_i = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, blank=True, db_column='id_address_journey_i')
    cost_journey_d = models.DecimalField(max_digits=10, decimal_places=2, db_column='cost_journey_d')
    available_seats_i = models.IntegerField(db_column='available_seats_i')
    status_v = models.CharField(max_length=20, db_column='status_v')
    date_create_t = models.DateTimeField(auto_now_add=True, db_column='date_create_t')
    date_update_t = models.DateTimeField(auto_now=True, db_column='date_update_t')
    is_active_b = models.BooleanField(default=True, db_column='is_active_b')

    class Meta:
        db_table = 'journey'
    
    def __str__(self):
        return f"Viaje {self.id_journey_i} ({self.status_v} - Asientos: {self.available_seats_i})"

class Reservation(models.Model):
    id_reservation_i = models.AutoField(primary_key=True, db_column='id_reservation_i')
    id_journey_reservation_i = models.ForeignKey(Journey, on_delete=models.CASCADE, db_column='id_journey_reservation_i')
    id_user_passenger_reservation_i = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column='id_user_passenger_reservation_i')
    price_user_pass_d = models.DecimalField(max_digits=10, decimal_places=2, db_column='price_user_pass_d')
    date_create_t = models.DateTimeField(auto_now_add=True, db_column='date_create_t')
    date_update_t = models.DateTimeField(auto_now=True, db_column='date_update_t')
    is_active_b = models.BooleanField(default=True, db_column='is_active_b')

    class Meta:
        db_table = 'reservation'
    
    def __str__(self):
        return f"Reserva {self.id_reservation_i} - Viaje {self.id_journey_reservation_i_id}"

class Rating(models.Model):
    id_rating_i = models.AutoField(primary_key=True, db_column='id_rating_i')
    id_journey_rating_i = models.ForeignKey(Journey, on_delete=models.CASCADE, db_column='id_journey_rating_i')
    id_user_rating_i = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column='id_user_rating_i')
    rating_f = models.FloatField(db_column='rating_f')
    comment_user_v = models.CharField(max_length=225, db_column='comment_user_v')
    date_create_t = models.DateTimeField(auto_now_add=True, db_column='date_create_t')
    date_update_t = models.DateTimeField(auto_now=True, db_column='date_update_t')
    is_active_b = models.BooleanField(default=True, db_column='is_active_b')
    
    class Meta:
        db_table = 'rating'
    
    def __str__(self):
        return f"Rating {self.id_rating_i} - Calificación: {self.rating_f}"
