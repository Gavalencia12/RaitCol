function getCsrfToken() {
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith('csrftoken='));
    return cookie ? cookie.trim().split('=')[1] : '';
}

/**
 * Muestra un toast de notificación en pantalla.
 * @param {string} message - Texto a mostrar
 * @param {'success'|'error'|'warning'} type - Tipo de notificación
 */
function showReportToast(message, type = 'success') {
    // Eliminar toast previo si existe
    const prev = document.getElementById('reportToast');
    if (prev) prev.remove();

    const icons = {
        success: 'fa-circle-check',
        error:   'fa-circle-exclamation',
        warning: 'fa-triangle-exclamation',
    };

    const toast = document.createElement('div');
    toast.id = 'reportToast';
    toast.className = `report-toast report-toast--${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.success} report-toast__icon"></i>
        <span class="report-toast__msg">${message}</span>
    `;

    document.body.appendChild(toast);

    // Animar entrada
    requestAnimationFrame(() => toast.classList.add('report-toast--show'));

    // Auto-remover tras 4 segundos
    setTimeout(() => {
        toast.classList.remove('report-toast--show');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 4000);
}

function openReportUserModal() {
    const journeyId = currentRideData?.id || '';
    const driverId = currentRideData?.driverId || '';

    document.getElementById('report-ride-id').value = journeyId;
    document.getElementById('report-user-id').value = driverId;

    const modal = document.getElementById('reportUserModal');
    modal.classList.add('active');
}

function closeReportUserModal() {
    const modal = document.getElementById('reportUserModal');
    modal.classList.remove('active');
    document.getElementById('reportUserForm').reset();
}

async function submitReport(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const journeyId = document.getElementById('report-ride-id').value;
    const reportedUserId = document.getElementById('report-user-id').value;
    const reason = form.querySelector('input[name="report_reason"]:checked')?.value;
    const description = document.getElementById('report-user-description').value.trim();

    if (!reason) {
        showReportToast('Por favor selecciona un motivo de reporte.', 'warning');
        return;
    }

    if (!journeyId || !reportedUserId) {
        showReportToast('No se pudo identificar el viaje o el conductor.', 'error');
        return;
    }

    // Deshabilitar el botón para evitar doble envío
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    try {
        const resp = await fetch('/api/report-user/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
            },
            body: JSON.stringify({
                report_ride_id: journeyId,
                report_user_id: reportedUserId,
                report_reason: reason,
                description: description,
            }),
        });

        const data = await resp.json();

        if (data.success) {
            closeReportUserModal();
            showReportToast(data.message || 'Reporte enviado exitosamente.', 'success');
        } else {
            showReportToast(data.message || 'No se pudo enviar el reporte.', 'error');
        }
    } catch (err) {
        console.error('Error al enviar reporte:', err);
        showReportToast('Error de red. Intenta de nuevo.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar Reporte';
    }
}

// Registrar el listener del formulario cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reportUserForm');
    if (form) {
        form.addEventListener('submit', submitReport);
    }
});

window.openReportUserModal = openReportUserModal;
window.closeReportUserModal = closeReportUserModal;