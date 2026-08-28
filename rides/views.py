from django.shortcuts import render

# Create your views here.
# Create your views here.
def home(request):
    # Optional data passed to the template
    context = {
        "title": "Welcome to My Site",
        "description": "This is a basic Django application."
    }
    return render(request, "home.html", context)
