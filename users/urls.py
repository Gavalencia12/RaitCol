from django.urls import path
from . import views

urlpatterns = [
    # Pages
    path('login/', views.login_page, name='login_page'),
    path('register/', views.register_view, name='register'),
    
    # APIs
    path('uniride/auth/login/', views.login_view, name='login'),
    path('uniride/auth/logout/', views.logout_view, name='logout'),
    path('uniride/auth/status/', views.status_view, name='status'),
    path('uniride/auth/register/', views.register_user_api, name='register_api'),
    path('uniride/auth/verify/', views.verify_code_api, name='verify_code_api'),
    path('uniride/auth/resend/', views.resend_code_api, name='resend_code_api'),
]