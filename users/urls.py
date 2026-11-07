from django.urls import path
from . import views

urlpatterns = [
    # Pages
    path('login/', views.login_page, name='login_page'),
    path('register/', views.register_view, name='register'),
    path('forgot-password/', views.forgot_password, name='forgot_password'),
    path('terms/', views.terms_view, name='terms'),
    path('profile/', views.profile_view, name='profile'),
    path('change_password/', views.change_pass_view, name='change_password'),

    # APIs
    path('uniride/auth/login/', views.login_view, name='login'),
    path('uniride/auth/logout/', views.logout_view, name='logout'),
    path('uniride/auth/status/', views.status_view, name='status'),
    path('uniride/auth/register/', views.register_user_api, name='register_api'),
    path('uniride/auth/verify/', views.verify_code_api, name='verify_code_api'),
    path('uniride/auth/resend/', views.resend_code_api, name='resend_code_api'),
    path('uniride/auth/forgot/', views.forgot_user_api, name='forgot_user_api'),
    path('uniride/auth/forgot/verify/', views.forgot_verify_code_api, name='forgot_verify_code_api'),
    path('uniride/auth/forgot/resend/', views.forgot_resend_code_api, name='forgot_resend_code_api'),
    path('uniride/auth/forgot/reset/', views.forgot_reset_password_api, name='forgot_reset_password_api'),
]