from django.contrib import admin
from .models import Address, Car, Route, Journey, Reservation, Rating

admin.site.register(Address)
admin.site.register(Car)
admin.site.register(Route)
admin.site.register(Journey)
admin.site.register(Reservation)
admin.site.register(Rating)