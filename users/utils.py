import os
import json
import logging
import urllib.request
import urllib.error
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)

def send_custom_email(subject, message, recipient_list, from_email=None):
    """
    Envía correo utilizando HTTP API de Brevo o Resend (para omitir bloqueos SMTP de Render/nube)
    o fallback a Django SMTP send_mail.
    """
    if from_email is None:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'raitcol41@gmail.com')

    if isinstance(recipient_list, str):
        recipient_list = [recipient_list]

    brevo_key = os.getenv('BREVO_API_KEY') or os.getenv('SENDINBLUE_API_KEY')
    resend_key = os.getenv('RESEND_API_KEY')

    # Opción 1: Brevo API HTTP (Puerto HTTPS 443)
    if brevo_key:
        for header_name in ["api-key", "x-mailin-api-key"]:
            try:
                url = "https://api.brevo.com/v3/smtp/email"
                payload = {
                    "sender": {"name": "UniRide", "email": from_email},
                    "to": [{"email": r} for r in recipient_list],
                    "subject": subject,
                    "textContent": message
                }
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode('utf-8'),
                    headers={
                        "accept": "application/json",
                        header_name: brevo_key.strip(),
                        "content-type": "application/json"
                    },
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    if resp.status in (200, 201, 202):
                        logger.info(f"Correo enviado exitosamente vía Brevo API HTTP ({header_name})")
                        return True
            except Exception as e:
                logger.error(f"Error al enviar vía Brevo API ({header_name}): {e}")

    # Opción 2: Resend API HTTP
    if resend_key:
        try:
            url = "https://api.resend.com/emails"
            payload = {
                "from": f"UniRide <{from_email}>",
                "to": recipient_list,
                "subject": subject,
                "text": message
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status in (200, 201, 202):
                    logger.info("Correo enviado exitosamente vía Resend API HTTP")
                    return True
        except Exception as e:
            logger.error(f"Error al enviar vía Resend API: {e}")

    # Opción 3: Fallback SMTP de Django
    send_mail(
        subject=subject,
        message=message,
        from_email=from_email,
        recipient_list=recipient_list,
        fail_silently=False
    )
    return True
