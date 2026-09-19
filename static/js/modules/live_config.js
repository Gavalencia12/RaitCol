let liveMapInstance = null;
let liveDriverMarker = null;
let currentRideData = {};
let originMarkerInstance = null;
let destinationMarkerInstance = null;
let userRealMarker = null;
let watchPositionId = null;
let pollIntervalId = null;
let lastLocationSendTime = 0;
let currentSelectedSeat = null;

function parseCoord(val, defaultVal) {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (!val) return defaultVal;
  const cleanStr = String(val).replace(',', '.');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? defaultVal : num;
}

function setElementText(id, text) {
  const el = document.getElementById(id);
  if (el && text !== undefined) el.textContent = text;
}

function setElementHTML(id, html) {
  const el = document.getElementById(id);
  if (el && html !== undefined) el.innerHTML = html;
}

const MODAL_ROLE_CONFIGS = {
  driver: {
    panelId: 'panelDriverRole',
    sidebarTitle: 'Gestión del Conductor',
    badgeText: 'GPS Transmitiendo',
    roleBadgeHTML: '<i class="fas fa-crown"></i> Tu Viaje (Conductor)',
    roleBadgeClass: 'badge badge-role-driver',
    seatsSubtitle: 'Ocupación de tu vehículo'
  },
  passenger: {
    panelId: 'panelPassengerRole',
    sidebarTitle: 'Seguimiento de tu Viaje',
    badgeText: 'En vivo',
    roleBadgeHTML: '<i class="fas fa-check-circle"></i> Reserva Confirmada',
    roleBadgeClass: 'badge badge-role-passenger',
    seatsSubtitle: 'Tu reserva está activa'
  },
  visitor: {
    panelId: 'panelVisitorRole',
    sidebarTitle: 'Detalles del Viaje',
    badgeText: 'Ruta Programada',
    roleBadgeHTML: '<i class="fas fa-ticket"></i> Reserva tu Lugar',
    roleBadgeClass: 'badge badge-role-visitor',
    seatsSubtitle: 'Elige un asiento disponible'
  }
};

const FEED_ROLE_CONFIGS = {
  passenger: {
    isPassenger: 'true',
    btnClass: 'btn-join-ride btn-role-passenger',
    btnHTML: '<i class="fas fa-location-dot"></i> Rastrear en Vivo',
    badgeHTML: `
      <span class="badge badge-primary" style="background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;"><i class="fas fa-check-circle"></i> Reserva Confirmada</span>
      <span class="badge badge-secondary">$${currentRideData.cost || '0'}</span>
    `
  },
  visitor: {
    isPassenger: 'false',
    btnClass: 'btn-join-ride btn-role-visitor',
    btnHTML: '<i class="fas fa-ticket"></i> Ver Detalle / Reservar',
    badgeHTML: `
      <span class="badge badge-success">${currentRideData.availableSeats || 0} Lugares libres</span>
      <span class="badge badge-secondary">$${currentRideData.cost || '0'}</span>
    `
  }
};
