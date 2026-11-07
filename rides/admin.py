from django.contrib import admin
from django.contrib import messages

from .models import Address, Car, Route, Journey, Reservation, Rating, Report
from .moderation import confirm_report, dismiss_report

admin.site.register(Address)
admin.site.register(Car)
admin.site.register(Route)
admin.site.register(Journey)
admin.site.register(Reservation)
admin.site.register(Rating)


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = (
        'id_report_i',
        'id_reported_user_i',
        'id_journey_report_i',
        'id_reporter_i',
        'get_reason_i_display',
        'status',
        'date_create_t',
        'reviewed_at',
        'reviewed_by',
    )
    list_filter = ('status', 'reason_i', 'date_create_t')
    search_fields = (
        'id_reported_user_i__username',
        'id_reporter_i__username',
        'description_v',
    )
    readonly_fields = (
        'id_journey_report_i',
        'id_reporter_i',
        'id_reported_user_i',
        'reason_i',
        'description_v',
        'date_create_t',
        'status',
        'reviewed_at',
        'reviewed_by',
    )
    actions = ('confirm_pending_reports', 'dismiss_pending_reports')

    @admin.action(description='Confirmar reportes pendientes seleccionados')
    def confirm_pending_reports(self, request, queryset):
        confirmed = 0
        for report_id in queryset.filter(status=Report.STATUS_PENDING).values_list('pk', flat=True):
            did_confirm, warnings_count = confirm_report(report_id, request.user)
            if did_confirm:
                confirmed += 1
                if warnings_count == 4:
                    self.message_user(
                        request,
                        f'El conductor alcanzó 4 reportes confirmados y queda suspendido para publicar durante 72 horas.',
                        level=messages.WARNING,
                    )

        self.message_user(request, f'{confirmed} reporte(s) confirmado(s).')

    @admin.action(description='Descartar reportes pendientes seleccionados')
    def dismiss_pending_reports(self, request, queryset):
        dismissed = 0
        for report_id in queryset.filter(status=Report.STATUS_PENDING).values_list('pk', flat=True):
            if dismiss_report(report_id, request.user):
                dismissed += 1

        self.message_user(request, f'{dismissed} reporte(s) descartado(s).')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False