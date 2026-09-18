function startPassengerPolling() {
  stopPassengerPolling();
  if (!currentRideData.id) return;

  pollIntervalId = setInterval(async () => {
    try {
      const resp = await fetch(`/api/journey/${currentRideData.id}/`);
      if (resp.ok) {
        const freshData = await resp.json();

        if (freshData.originLat && freshData.originLng && liveDriverMarker) {
          const dLat = parseCoord(freshData.originLat);
          const dLng = parseCoord(freshData.originLng);
          liveDriverMarker.setLngLat([dLng, dLat]);
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

