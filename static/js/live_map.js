document.addEventListener('DOMContentLoaded', () => {
  initLiveModalControls();
  startGlobalFeedPolling();
  window.addEventListener('resize', () => {
    liveMapInstance?.resize?.();
  });
});

function startGlobalFeedPolling() {
  setInterval(() => {
    const rideBtns = document.querySelectorAll('button[data-ride-id]');
    const processedIds = new Set();
    rideBtns.forEach(async (btn) => {
      const rideId = btn.dataset.rideId;
      if (!rideId || processedIds.has(rideId)) return;
      processedIds.add(rideId);
      try {
        const resp = await fetch(`/api/journey/${rideId}/`);
        if (resp.ok) {
          const data = await resp.json();
          const role = data.isDriver ? 'driver' : (data.isPassenger ? 'passenger' : 'visitor');
          updateFeedCardRoleUI(rideId, role, data.availableSeats);
        }
      } catch (e) { }
    });
  }, 4000);
}

function switchModalRoleView(role = 'visitor') {
  const config = MODAL_ROLE_CONFIGS[role] || MODAL_ROLE_CONFIGS.visitor;

  ['panelVisitorRole', 'panelPassengerRole', 'panelDriverRole'].forEach(id => {
    const p = document.getElementById(id);
    if (p) p.style.display = (id === config.panelId) ? 'block' : 'none';
  });

  setElementText('sidebarTitle', config.sidebarTitle);
  setElementText('mapLiveBadgeText', config.badgeText);
  setElementHTML('modalHeaderRoleText', config.roleBadgeHTML);

  const roleBadgeBox = document.getElementById('modalHeaderRoleBadge');
  if (roleBadgeBox) roleBadgeBox.className = config.roleBadgeClass;

  renderSeatsGrid(currentRideData.seats || [], role);
  if (role === 'driver') {
    renderDriverPassengersList(currentRideData.seats || []);
  }
}

function initLiveModalControls() {
  const backdrop = document.getElementById('liveRideModalBackdrop');
  const closeBtn = document.getElementById('btnCloseLiveModal');

  if (closeBtn) closeBtn.addEventListener('click', closeLiveRideModal);
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeLiveRideModal();
    });
  }

  const btnReserveAction = document.getElementById('btnReserveSeatAction');
  if (btnReserveAction) btnReserveAction.addEventListener('click', handleReserveAction);

  const btnCancelAction = document.getElementById('btnCancelReservationAction');
  if (btnCancelAction) btnCancelAction.addEventListener('click', handleCancelAction);

  const btnCenterOrigin = document.getElementById('btnCenterOnOrigin');
  if (btnCenterOrigin) {
    btnCenterOrigin.addEventListener('click', () => {
      const originLng = parseCoord(currentRideData.originLng, null);
      const originLat = parseCoord(currentRideData.originLat, null);
      if (liveMapInstance && originLng !== null && originLat !== null) {
        liveMapInstance.flyTo({ center: [originLng, originLat], zoom: 16 });
      }
    });
  }

  const btnZoomIn = document.getElementById('mapZoomIn');
  if (btnZoomIn) btnZoomIn.addEventListener('click', () => liveMapInstance?.zoomIn?.());

  const btnZoomOut = document.getElementById('mapZoomOut');
  if (btnZoomOut) btnZoomOut.addEventListener('click', () => liveMapInstance?.zoomOut?.());
}

async function handleReserveAction() {
  if (!currentRideData.id) return;
  const btn = document.getElementById('btnReserveSeatAction');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Confirmando reserva...';
  }

  try {
    const payload = {};
    if (currentSelectedSeat) payload.seat_number = currentSelectedSeat;

    const resp = await fetch(`/api/journey/${currentRideData.id}/reserve/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();

    if (data.success) {
      currentRideData.isPassenger = true;
      currentRideData.isVisitor = false;
      currentRideData.availableSeats = data.availableSeats;

      // Actualización instantánea local (0ms)
      if (currentSelectedSeat && currentRideData.seats) {
        const seatObj = currentRideData.seats.find(s => s.seatNumber === currentSelectedSeat);
        if (seatObj) {
          seatObj.isTaken = true;
          seatObj.isCurrentUser = true;
        }
      }

      switchModalRoleView('passenger');
      if (currentRideData.seats) renderSeatsGrid(currentRideData.seats, 'passenger');
      updateFeedCardRoleUI(currentRideData.id, 'passenger', data.availableSeats);

      try {
        const freshResp = await fetch(`/api/journey/${currentRideData.id}/`);
        if (freshResp.ok) {
          const freshData = await freshResp.json();
          if (freshData.seats) {
            currentRideData.seats = freshData.seats;
            renderSeatsGrid(currentRideData.seats, 'passenger');
          }
        }
      } catch (e) { }

      startPassengerPolling();
    } else {
      alert(data.message || 'No se pudo realizar la reserva.');
    }
  } catch (err) {
    console.error('Error al reservar:', err);
    alert('Ocurrió un error al procesar la reserva. Intenta de nuevo.');
  } finally {
    if (btn) {
      btn.disabled = false;
      const seatText = currentSelectedSeat ? `Asiento #${currentSelectedSeat}` : '1 Asiento';
      btn.innerHTML = `<i class="fas fa-ticket"></i> Reservar ${seatText}`;
    }
  }
}

async function handleCancelAction() {
  if (!currentRideData.id) return;
  if (!confirm('¿Estás seguro de que deseas cancelar tu reserva?')) return;

  const btn = document.getElementById('btnCancelReservationAction');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelando reserva...';
  }

  try {
    const resp = await fetch(`/api/journey/${currentRideData.id}/cancel-reservation/`, {
      method: 'POST',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
    const data = await resp.json();

    if (data.success) {
      currentRideData.isPassenger = false;
      currentRideData.isVisitor = true;
      currentRideData.availableSeats = data.availableSeats;
      currentSelectedSeat = null;

      try {
        const freshResp = await fetch(`/api/journey/${currentRideData.id}/`);
        if (freshResp.ok) {
          const freshData = await freshResp.json();
          if (freshData.seats) currentRideData.seats = freshData.seats;
          if (freshData.availableSeats !== undefined) currentRideData.availableSeats = freshData.availableSeats;
        }
      } catch (e) { }

      switchModalRoleView('visitor');
      stopPassengerPolling();

      setElementHTML('visitorSeatsDisplay', `<i class="fas fa-chair" style="color: #00b865;"></i> ${currentRideData.availableSeats} asientos libres disponibles`);
      updateFeedCardRoleUI(currentRideData.id, 'visitor', currentRideData.availableSeats);
    } else {
      alert(data.message || 'No se pudo cancelar la reserva.');
    }
  } catch (err) {
    console.error('Error al cancelar reserva:', err);
    alert('Ocurrió un error al procesar la cancelación.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-ban"></i> Cancelar mi Reserva';
    }
  }
}

function updateModalRideDetails(rideData) {
  if (rideData.cost !== undefined) {
    setElementText('visitorCostDisplay', `$${parseFloat(rideData.cost).toFixed(2)}`);
  }
  if (rideData.availableSeats !== undefined) {
    setElementHTML('visitorSeatsDisplay', `<i class="fas fa-chair" style="color: #00b865;"></i> ${rideData.availableSeats} asientos libres disponibles`);
  }

  if (rideData.driverName) {
    const initials = rideData.driverName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '--';
    setElementText('liveModalDriverName', rideData.driverName);
    setElementText('driverCardName', rideData.driverName);
    setElementText('liveModalDriverAvatar', initials);
    setElementText('driverCardInitials', initials);
  }

  if (rideData.carModel || rideData.carPlates) {
    const carInfo = [rideData.carModel, rideData.carColor, rideData.carPlates ? `(${rideData.carPlates})` : ''].filter(Boolean).join(' • ');
    setElementText('liveModalCarText', carInfo);
  }

  if (rideData.origin && rideData.destination) {
    setElementHTML('liveModalRouteTitle', `<span>${rideData.origin}</span> <i class="fas fa-arrow-right"></i> <span>${rideData.destination}</span>`);
  }
  setElementText('liveTimelineOriginName', rideData.origin);
  setElementText('liveTimelineDestName', rideData.destination);
}

function openLiveRideModal(rideData = {}) {
  currentRideData = Object.assign(currentRideData || {}, rideData);
  const backdrop = document.getElementById('liveRideModalBackdrop');
  if (!backdrop) return;

  backdrop.classList.add('active');
  document.body.style.overflow = 'hidden';

  const activeRole = currentRideData.isDriver ? 'driver' : (currentRideData.isPassenger ? 'passenger' : 'visitor');
  switchModalRoleView(activeRole);
  updateModalRideDetails(rideData);

  if (currentRideData.isDriver && currentRideData.id) {
    startDriverGpsWatch(currentRideData.id);
    if (typeof startDriverPolling === 'function') startDriverPolling(currentRideData.id);
  }

  if (currentRideData.isPassenger && !currentRideData.isDriver) {
    startPassengerPolling();
  }

  setTimeout(() => {
    setupMapboxGLMap();
    if (liveMapInstance) liveMapInstance.resize();
  }, 150);

  setTimeout(() => {
    if (liveMapInstance) liveMapInstance.resize();
  }, 350);
}

function closeLiveRideModal() {
  const backdrop = document.getElementById('liveRideModalBackdrop');
  if (!backdrop) return;

  stopDriverGpsWatch();
  if (typeof stopDriverPolling === 'function') stopDriverPolling();
  stopPassengerPolling();

  backdrop.classList.remove('active');
  document.body.style.overflow = '';
}

function updateFeedCardRoleUI(rideId, role, availableSeats) {
  const btn = document.querySelector(`button[data-ride-id="${rideId}"]`);
  if (!btn) return;

  const card = btn.closest('.ride-card');
  if (!card) return;

  const badgesContainer = card.querySelector('.ride-badges');
  const cfg = FEED_ROLE_CONFIGS[role];
  if (cfg) {
    btn.dataset.isPassenger = cfg.isPassenger;
    btn.className = cfg.btnClass;
    btn.innerHTML = cfg.btnHTML;
    if (badgesContainer) badgesContainer.innerHTML = cfg.badgeHTML;
  }
}

function openLiveRideFromBtn(btn) {
  if (!btn) return;
  const rideId = btn.dataset.rideId;
  if (!rideId) return;

  fetch(`/api/journey/${rideId}/`)
    .then(resp => resp.ok ? resp.json() : null)
    .then(apiData => {
      if (apiData) openLiveRideModal(apiData);
    })
    .catch(e => console.warn('Error al cargar detalle del viaje:', e));
}

window.openLiveRideFromBtn = openLiveRideFromBtn;
window.openLiveRideModal = openLiveRideModal;
window.closeLiveRideModal = closeLiveRideModal;

