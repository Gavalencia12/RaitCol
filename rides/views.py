from django.shortcuts import render
from django.contrib.auth.decorators import login_required

# Create your views here.
@login_required(login_url='login_page')
def home(request):
    # Optional data passed to the template
    context = {
        "title": "Bienvenido a UniRide",
        "description": "Tu plataforma de rides compartidos de la Ucol."
    }
    return render(request, "home.html", context)
