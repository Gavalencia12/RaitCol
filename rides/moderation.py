from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from .models import DriverModerationStatus, Report


TEMPORARY_SUSPENSION_DURATION = timedelta(hours=72)
PERMANENT_PUBLISH_BLOCK_THRESHOLD = 6
TEMPORARY_SUSPENSION_THRESHOLD = 4


def confirmed_report_count(user):
    return Report.objects.filter(
        id_reported_user_i=user,
        status=Report.STATUS_CONFIRMED,
    ).count()


def get_publication_restriction(user, at=None):
    at = at or timezone.now()
    warnings_count = confirmed_report_count(user)
    if warnings_count >= PERMANENT_PUBLISH_BLOCK_THRESHOLD:
        return {
            'blocked': True,
            'reason': 'permanent',
            'warnings_count': warnings_count,
            'suspended_until': None,
        }

    moderation_status = DriverModerationStatus.objects.filter(user=user).first()
    suspended_until = moderation_status.publish_suspended_until if moderation_status else None
    if suspended_until and suspended_until > at:
        return {
            'blocked': True,
            'reason': 'temporary',
            'warnings_count': warnings_count,
            'suspended_until': suspended_until,
        }

    return {
        'blocked': False,
        'reason': None,
        'warnings_count': warnings_count,
        'suspended_until': suspended_until,
    }


@transaction.atomic
def confirm_report(report_id, reviewer):
    report = Report.objects.select_for_update().get(pk=report_id)
    User = get_user_model()
    User.objects.select_for_update().get(pk=report.id_reported_user_i_id)
    if report.status != Report.STATUS_PENDING:
        return False, confirmed_report_count(report.id_reported_user_i)

    report.status = Report.STATUS_CONFIRMED
    report.reviewed_at = timezone.now()
    report.reviewed_by = reviewer
    report.save(update_fields=['status', 'reviewed_at', 'reviewed_by'])

    driver = report.id_reported_user_i
    warnings_count = confirmed_report_count(driver)
    if warnings_count == TEMPORARY_SUSPENSION_THRESHOLD:
        status, _ = DriverModerationStatus.objects.get_or_create(user=driver)
        status.publish_suspended_until = timezone.now() + TEMPORARY_SUSPENSION_DURATION
        status.save(update_fields=['publish_suspended_until'])

    return True, warnings_count


@transaction.atomic
def dismiss_report(report_id, reviewer):
    report = Report.objects.select_for_update().get(pk=report_id)
    if report.status != Report.STATUS_PENDING:
        return False

    report.status = Report.STATUS_DISMISSED
    report.reviewed_at = timezone.now()
    report.reviewed_by = reviewer
    report.save(update_fields=['status', 'reviewed_at', 'reviewed_by'])
    return True
