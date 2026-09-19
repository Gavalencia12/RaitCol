function renderDriverPassengersList(seatsList = []) {
  const container = document.getElementById('driverSeatsContainer');
  if (!container) return;

  container.innerHTML = '';

  const takenSeats = seatsList.filter(s => s.isTaken);

  if (takenSeats.length === 0) {
    container.innerHTML = `
      <div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 12px; font-weight: 600; background: var(--bg-surface); border-radius: 10px; border: 1px dashed var(--border-color);">
        <i class="fas fa-user-slash" style="margin-right: 4px;"></i> Aún no tienes pasajeros con reserva en este viaje.
      </div>
    `;
    return;
  }

  takenSeats.forEach(seat => {
    const el = document.createElement('div');
    el.style.cssText = 'padding: 10px 12px; border-radius: 10px; background: #ffffff; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; gap: 8px;';

    el.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 34px; height: 34px; border-radius: 50%; background: #e0f2fe; color: #0284c7; font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <i class="fas fa-user-check"></i>
        </div>
        <div style="display: flex; flex-direction: column;">
          <span style="font-size: 13px; font-weight: 700; color: var(--text-main);">${seat.passengerName || 'Pasajero'}</span>
          <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Asiento #${seat.seatNumber} • ${seat.passengerAccount ? `Cuenta: ${seat.passengerAccount}` : 'Confirmado'}</span>
        </div>
      </div>
      <span style="font-size: 11px; font-weight: 700; color: #15803d; background: #dcfce7; padding: 4px 10px; border-radius: 12px; display: flex; align-items: center; gap: 4px;">
        <i class="fas fa-location-dot"></i> En Ubicación
      </span>
    `;

    container.appendChild(el);
  });
}

function startDriverGpsWatch(rideId) {
  stopDriverGpsWatch();
  if (!navigator.geolocation || !rideId) return;

  watchPositionId = navigator.geolocation.watchPosition(async (pos) => {
    const dLat = pos.coords.latitude;
    const dLng = pos.coords.longitude;
    if (liveDriverMarker) {
      liveDriverMarker.setLngLat([dLng, dLat]);
    }
    try {
      await fetch(`/api/journey/${rideId}/update-location/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_lat: dLat, driver_lng: dLng })
      });
    } catch (e) {
      console.warn('Error al transmitir posición GPS:', e);
    }
  }, (err) => console.warn('Advertencia Geolocation:', err.message), {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  });
}

function stopDriverGpsWatch() {
  if (watchPositionId !== null) {
    navigator.geolocation.clearWatch(watchPositionId);
    watchPositionId = null;
  }
}

let driverPollIntervalId = null;

function startDriverPolling(rideId) {
  stopDriverPolling();
  if (!rideId) return;

  driverPollIntervalId = setInterval(async () => {
    try {
      const resp = await fetch(`/api/journey/${rideId}/`);
      if (resp.ok) {
        const freshData = await resp.json();
        if (freshData.seats) {
          currentRideData.seats = freshData.seats;
          renderSeatsGrid(currentRideData.seats, 'driver');
          renderDriverPassengersList(currentRideData.seats);
        }
        if (freshData.availableSeats !== undefined) {
          currentRideData.availableSeats = freshData.availableSeats;
          updateFeedCardRoleUI(currentRideData.id, 'driver', freshData.availableSeats);
        }
      }
    } catch (e) {
      console.warn('Sondeo automático de conductor:', e);
    }
  }, 3000);
}

function stopDriverPolling() {
  if (driverPollIntervalId !== null) {
    clearInterval(driverPollIntervalId);
    driverPollIntervalId = null;
  }
}
