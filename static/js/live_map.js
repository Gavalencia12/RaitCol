document.addEventListener('DOMContentLoaded', () => {
  initLiveModalControls();
  startGlobalFeedPolling();
  window.addEventListener('resize', () => {
    liveMapInstance?.resize?.();
  });
});

let globalPollInterval = null;

function startGlobalFeedPolling() {
  if (globalPollInterval) clearInterval(globalPollInterval);

  globalPollInterval = setInterval(async () => {
    const backdrop = document.getElementById('liveRideModalBackdrop');
    if (document.hidden || (backdrop && backdrop.classList.contains('active'))) return;

    const rideBtns = document.querySelectorAll('button[data-ride-id]');
    const uniqueIds = Array.from(new Set(Array.from(rideBtns).map(btn => btn.dataset.rideId).filter(Boolean)));

    if (uniqueIds.length === 0) return;

    try {
      const resp = await fetch(`/api/journeys/updates/?ids=${uniqueIds.join(',')}`);
      
      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          uniqueIds.forEach(id => {
            const update = data.updates[id];
            
            if (update) {
              updateFeedCardSeats(id, update.availableSeats, update.cost);
            } else {
              removeRideCard(id);
            }
          });
        }
      }
    } catch (e) {
      console.warn('Error en bulk polling:', e);
    }
  }, 10000); 
}

function updateFeedCardSeats(rideId, seats, cost) {
  const btn = document.querySelector(`button[data-ride-id="${rideId}"]`);
  if (!btn) return;
  const card = btn.closest('.ride-card');
  if (!card) return;

  card.dataset.seats = seats;
  if (cost !== undefined) card.dataset.cost = cost;

  if (btn.classList.contains('btn-role-visitor')) {
    const badgesContainer = card.querySelector('.ride-badges');
    if (badgesContainer) {
      badgesContainer.innerHTML = `
        <span class="badge badge-success">${seats} Lugares libres</span>
        <span class="badge badge-secondary">$${parseFloat(cost).toFixed(2)}</span>
      `;
    }
  }
}

function removeRideCard(rideId) {
  const btn = document.querySelector(`button[data-ride-id="${rideId}"]`);
  if (!btn) return;
  const card = btn.closest('.ride-card');
  if (card) {
    card.style.transition = 'all 0.5s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.9)';
    setTimeout(() => {
      card.remove();
      if (typeof updateProximityUIFilter === 'function') updateProximityUIFilter();
    }, 500);
  }
}

function removeRideCard(rideId) {
  const btn = document.querySelector(`button[data-ride-id="${rideId}"]`);
  if (!btn) return;
  const card = btn.closest('.ride-card');
  if (card) {
    card.style.transition = 'all 0.5s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.9)';
    setTimeout(() => {
      card.remove();
      if (typeof updateProximityUIFilter === 'function') updateProximityUIFilter();
    }, 500);
  }
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

  // Reportar solo lo ven los pasajeros confirmados
  const reportBtn = document.getElementById('reportUserButtonWrapper');
  if (reportBtn) {
    reportBtn.style.display = (role === 'passenger') ? 'block' : 'none';
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
    const pickupLat = document.getElementById('inputPickupLat')?.value || null;
    const pickupLng = document.getElementById('inputPickupLng')?.value || null;
    const pickupName = document.getElementById('inputPickupPointName')?.value.trim() || 'Punto de encuentro asignado';

    const payload = {
      pickup_lat: pickupLat,
      pickup_lng: pickupLng,
      pickup_name: pickupName
    };
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
            const currentRole = currentRideData.isDriver ? 'driver' : (currentRideData.isPassenger ? 'passenger' : 'visitor');
            renderSeatsGrid(currentRideData.seats, currentRole);
            if (currentRole === 'driver' && typeof renderDriverPassengersList === 'function') {
              renderDriverPassengersList(currentRideData.seats);
            }
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

//confirmar finalizacion de viaje
function confirmFinishRide() {
  const modal = document.getElementById('modalConfirmation');
  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
  }
}

function closeConfirmFinishModal() {
  const modal = document.getElementById('modalConfirmation');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 250);
    
  }
}
// Función usando classList.add()
function abrirModal(miModal) {
  const modal1 = document.getElementById(miModal);
  if (modal1) {
    modal1.showModal();
  }
}
function cerrarModal(miModal) {
  const modal1 = document.getElementById(miModal);
  if (modal1) {
    modal1.close();
  }
}

// Finalizar viaje
async function handleFinishRide() {
  if (!currentRideData.id) return;  
  const btn = document.getElementById('btnModalFinishConfirm') || document.getElementById('btnFinishRideAction');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finalizando...';
  }

  try {
    const resp = await fetch(`/api/journey/${currentRideData.id}/finish-ride/`, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json'
      }
    });
    const data = await resp.json();

    if (data.success) {
      closeConfirmFinishModal();
      if (typeof closeLiveRideModal === 'function') {
        closeLiveRideModal();
      }

      // Remover o desvanecer la tarjeta del viaje en el feed principal
      const rideCard = document.querySelector(`.ride-card button[onclick*="${currentRideData.id}"]`)?.closest('.ride-card');
      if (rideCard) {
        rideCard.style.transition = 'all 0.3s ease';
        rideCard.style.opacity = '0';
        rideCard.style.transform = 'scale(0.95)';
        setTimeout(() => {
          rideCard.remove();
          if (typeof updateProximityUIFilter === 'function') {
            updateProximityUIFilter();
          }
        }, 300);
      } else {
        window.location.reload();
      }
    } else {
      alert(data.message || 'No se pudo finalizar el viaje.');
    }
  } catch (err) {
    console.error('Error al finalizar viaje:', err);
    alert('Ocurrió un error al procesar la finalización del viaje.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-flag-checkered"></i> Sí, finalizar';
    }
  }
}
window.confirmFinishRide = confirmFinishRide;
window.closeConfirmFinishModal = closeConfirmFinishModal;
window.handleFinishRide = handleFinishRide;

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

    const modalAvatar = document.getElementById('liveModalDriverAvatar');
    if (modalAvatar) {
      if (rideData.driverImage) {
        modalAvatar.innerHTML = `<img src="${rideData.driverImage}" alt="Conductor" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
      } else {
        modalAvatar.textContent = initials;
      }
    }

    const cardAvatar = document.getElementById('driverCardInitials');
    if (cardAvatar) {
      if (rideData.carImage) {
        cardAvatar.innerHTML = `<img src="${rideData.carImage}" alt="Auto" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
      } else {
        cardAvatar.innerHTML = '<i class="fas fa-car" style="color: #64748b; font-size: 16px; margin-top: 12px;"></i>';
      }
    }
  }

  const timeElem = document.getElementById('liveTripDepartureTime');
  if (timeElem) {
    timeElem.textContent = rideData.departureTime || '--:--';
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

  if (globalPollInterval) {
    clearInterval(globalPollInterval);
    globalPollInterval = null;
  }

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
  if (typeof stopPassengerPolling === 'function') stopPassengerPolling();

  backdrop.classList.remove('active');
  document.body.style.overflow = '';
  startGlobalFeedPolling();
}

function updateFeedCardRoleUI(rideId, role, availableSeats, cost) {
  const btn = document.querySelector(`button[data-ride-id="${rideId}"]`);
  if (!btn) return;

  const card = btn.closest('.ride-card');
  if (!card) return;

  const rideCost = (cost !== undefined && cost !== null) ? cost : (card.dataset.cost || currentRideData.cost || '0');
  const rideSeats = (availableSeats !== undefined && availableSeats !== null) ? availableSeats : (card.dataset.seats || currentRideData.availableSeats || 0);

  const badgesContainer = card.querySelector('.ride-badges');

  if (role === 'driver') {
    btn.dataset.isPassenger = 'false';
    btn.className = 'btn-join-ride btn-role-driver';
    btn.innerHTML = '<i class="fas fa-sliders"></i> Gestionar mi Viaje';
    if (badgesContainer) {
      badgesContainer.innerHTML = `
        <span class="badge badge-role-driver"><i class="fas fa-crown"></i> Tu Viaje</span>
        <span class="badge badge-secondary">$${rideCost}</span>
      `;
    }
  } else if (role === 'passenger') {
    btn.dataset.isPassenger = 'true';
    btn.className = 'btn-join-ride btn-role-passenger';
    btn.innerHTML = '<i class="fas fa-location-dot"></i> Rastrear en Vivo';
    if (badgesContainer) {
      badgesContainer.innerHTML = `
        <span class="badge badge-primary" style="background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;"><i class="fas fa-check-circle"></i> Reserva Confirmada</span>
        <span class="badge badge-secondary">$${rideCost}</span>
      `;
    }
  } else {
    btn.dataset.isPassenger = 'false';
    btn.className = 'btn-join-ride btn-role-visitor';
    btn.innerHTML = '<i class="fas fa-ticket"></i> Ver Detalle / Reservar';
    if (badgesContainer) {
      badgesContainer.innerHTML = `
        <span class="badge badge-success">${rideSeats} Lugares libres</span>
        <span class="badge badge-secondary">$${rideCost}</span>
      `;
    }
  }

  if (typeof updateProximityUIFilter === 'function') {
    updateProximityUIFilter();
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
       //desde aqui tomo el ID del viaje desde el fech de la API
        // Como el modal ya se abrió y tenemos el apiData.id (ej. 22), 
        // se lo inyectamos al botón de calificación:
        const ratingBtn = document.querySelector('.open-modal-btn'); // Ajusta el selector si tu botón tiene otra clase o ID
        if (ratingBtn && apiData.id) {
          ratingBtn.setAttribute('data-journey-id', apiData.id);
          console.log("¡ID asignado con éxito al botón de calificación:", apiData.id);
        }
        // Fin de romar el ID par aabrir el modal
      
    })
    .catch(e => console.warn('Error al cargar detalle del viaje:', e));
}

window.openLiveRideFromBtn = openLiveRideFromBtn;
window.openLiveRideModal = openLiveRideModal;
window.closeLiveRideModal = closeLiveRideModal;
window.handleFinishRide = handleFinishRide;

