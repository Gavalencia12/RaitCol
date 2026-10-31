function startPassengerPolling() {
  stopPassengerPolling();
  if (!currentRideData.id) return;

  pollIntervalId = setInterval(async () => {
    if (document.hidden) return;
    try {
      const resp = await fetch(`/api/journey/${currentRideData.id}/`);
      if (resp.ok) {
        const freshData = await resp.json();

        const dLat = parseCoord(freshData.driverLat || freshData.originLat);
        const dLng = parseCoord(freshData.driverLng || freshData.originLng);
        if (dLat !== null && dLng !== null && liveDriverMarker) {
          liveDriverMarker.setLngLat([dLng, dLat]);
          // Actualizar posición del conductor en el estado compartido
          currentRideData.driverLat = dLat;
          currentRideData.driverLng = dLng;
          // Recalcular ETA real con la nueva posición
          updatePassengerETA();
        }

        if (freshData.seats) {
          currentRideData.seats = freshData.seats;
          const activeRole = currentRideData.isDriver ? 'driver' : (currentRideData.isPassenger ? 'passenger' : 'visitor');
          renderSeatsGrid(currentRideData.seats, activeRole);
        }

        if (freshData.availableSeats !== undefined) {
          currentRideData.availableSeats = freshData.availableSeats;
          const role = currentRideData.isDriver ? 'driver' : (currentRideData.isPassenger ? 'passenger' : 'visitor');
          updateFeedCardRoleUI(currentRideData.id, role, freshData.availableSeats);
        }
      }
    } catch (e) {
      console.warn('Sondeo GPS y asientos en tiempo real:', e);
    }
  }, 3500);
}

function stopPassengerPolling() {
  if (pollIntervalId !== null) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
}

async function updatePassengerETA() {
  const driverLat = parseCoord(currentRideData.driverLat, null);
  const driverLng = parseCoord(currentRideData.driverLng, null);
  const destLat   = parseCoord(currentRideData.destLat, null);
  const destLng   = parseCoord(currentRideData.destLng, null);

  const etaEl      = document.getElementById('liveEtaMinutes');
  const distanceEl = document.getElementById('liveDistanceProgress');
  const barFill    = document.getElementById('liveProgressBarFill');

  if (driverLat === null || driverLng === null || destLat === null || destLng === null) {
    if (currentRideData._totalRouteDurationMin !== undefined && etaEl) {
      etaEl.innerHTML = `${currentRideData._totalRouteDurationMin} <span>min</span>`;
    }
    if (barFill) barFill.style.width = '0%';
    return;
  }

  let token = '';
  const tokenElement = document.getElementById('mapbox-token-data');
  if (tokenElement && tokenElement.textContent) {
    try { token = JSON.parse(tokenElement.textContent); } catch (e) {}
  }
  if (!token) return;

  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${driverLng.toFixed(6)},${driverLat.toFixed(6)};${destLng.toFixed(6)},${destLat.toFixed(6)}?geometries=geojson&access_token=${token}`;
    const resp = await fetch(url);
    if (!resp.ok) return;
    const data = await resp.json();

    if (!data.routes || data.routes.length === 0) return;

    const remainingKm  = (data.routes[0].distance / 1000).toFixed(1);
    const remainingMin = Math.round(data.routes[0].duration / 60);
    const totalKm      = currentRideData._totalRouteDistanceKm || parseFloat(remainingKm);

    if (etaEl) etaEl.innerHTML = `${remainingMin} <span>min</span>`;

    if (distanceEl) distanceEl.textContent = `${remainingKm} km restantes`;

    if (barFill && totalKm > 0) {
      const traveledKm   = Math.max(0, totalKm - parseFloat(remainingKm));
      const progressPct  = Math.min(100, Math.round((traveledKm / totalKm) * 100));
      barFill.style.width = `${progressPct}%`;
    }
  } catch (err) {
    console.warn('Error al actualizar ETA del pasajero:', err);
  }
}

window.updatePassengerETA = updatePassengerETA;
