/**
 * Módulo de Filtrado Inteligente por Proximidad y Trazado de Ruta para UniRide
 */

let currentUserPosition = null;

function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371.0;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculatePointToSegmentDistanceKm(plat, plon, lat1, lon1, lat2, lon2) {
  const avgLatRad = ((lat1 + lat2 + plat) / 3) * Math.PI / 180;
  const kx = Math.cos(avgLatRad);

  const dx = (lon2 - lon1) * 111.0 * kx;
  const dy = (lat2 - lat1) * 111.0;

  const px = (plon - lon1) * 111.0 * kx;
  const py = (plat - lat1) * 111.0;

  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return calculateHaversineDistanceKm(plat, plon, lat1, lon1);
  }

  let t = (px * dx + py * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const qLat = lat1 + t * (lat2 - lat1);
  const qLon = lon1 + t * (lon2 - lon1);

  return calculateHaversineDistanceKm(plat, plon, qLat, qLon);
}

function calculateMinPolylineDistanceKm(plat, plon, polylineData) {
  if (!polylineData) return Infinity;

  let coords = polylineData;
  if (typeof polylineData === 'string') {
    try {
      const parsed = JSON.parse(polylineData);
      coords = parsed.coordinates || parsed;
    } catch (e) {
      return Infinity;
    }
  }

  if (!Array.isArray(coords) || coords.length === 0) return Infinity;

  let minDist = Infinity;

  for (let i = 0; i < coords.length; i++) {
    const pt = coords[i];
    if (!Array.isArray(pt) || pt.length < 2) continue;
    const cLon = parseFloat(pt[0]);
    const cLat = parseFloat(pt[1]);

    const distPt = calculateHaversineDistanceKm(plat, plon, cLat, cLon);
    if (distPt < minDist) minDist = distPt;

    if (i < coords.length - 1) {
      const nextPt = coords[i + 1];
      if (Array.isArray(nextPt) && nextPt.length >= 2) {
        const nLon = parseFloat(nextPt[0]);
        const nLat = parseFloat(nextPt[1]);
        const distSeg = calculatePointToSegmentDistanceKm(plat, plon, cLat, cLon, nLat, nLon);
        if (distSeg < minDist) minDist = distSeg;
      }
    }
  }

  return minDist;
}

function updateProximityUIFilter() {
  const cards = document.querySelectorAll('.ride-card[data-origin-lat]');
  const filterActiveCheckbox = document.getElementById('chkFilterNearbyOnly');
  const filterReservationsCheckbox = document.getElementById('chkFilterMyReservationsOnly');
  const filterRidesCheckbox = document.getElementById('chkFilterMyRidesOnly');
  const campusSelect = document.getElementById('selectCampusDestination');
  const priceSelect = document.getElementById('selectMaxPrice');
  const radiusSelect = document.getElementById('selectProximityRadius');
  const counterElement = document.getElementById('proximityFilterCounter');

  const isNearbyFilterActive = filterActiveCheckbox ? filterActiveCheckbox.checked : false;
  const isMyReservationsActive = filterReservationsCheckbox ? filterReservationsCheckbox.checked : false;
  const isMyRidesActive = filterRidesCheckbox ? filterRidesCheckbox.checked : false;
  const selectedCampus = campusSelect ? campusSelect.value : 'all';
  const selectedMaxPrice = priceSelect && priceSelect.value !== 'all' ? parseFloat(priceSelect.value) : Infinity;
  const maxRadiusKm = radiusSelect ? parseFloat(radiusSelect.value) : 3.0;

  let visibleCount = 0;
  let totalCards = cards.length;

  cards.forEach(card => {
    const origLat = parseFloat(card.dataset.originLat);
    const origLng = parseFloat(card.dataset.originLng);
    const polyline = card.dataset.polyline || '';
    const isPassenger = card.dataset.isPassenger === 'true';
    const isDriver = card.dataset.isDriver === 'true';
    const cardCost = parseFloat(card.dataset.cost || '0');
    const cardDest = (card.dataset.destination || '').toLowerCase();

    const badgeContainer = card.querySelector('.ride-badges');
    let proxBadge = card.querySelector('.badge-proximity-live');

    if (!proxBadge && badgeContainer) {
      proxBadge = document.createElement('span');
      proxBadge.className = 'badge badge-proximity-live';
      badgeContainer.appendChild(proxBadge);
    }

    // 1. Evaluación de Proximidad GPS
    let isNear = true;
    if (currentUserPosition) {
      const uLat = currentUserPosition.lat;
      const uLng = currentUserPosition.lng;

      const distOrigin = calculateHaversineDistanceKm(uLat, uLng, origLat, origLng);
      const distRoute = calculateMinPolylineDistanceKm(uLat, uLng, polyline);

      const isOriginNear = distOrigin <= maxRadiusKm;
      const isRouteNear = distRoute <= (maxRadiusKm * 0.75);
      isNear = isOriginNear || isRouteNear;

      if (proxBadge) {
        proxBadge.style.display = 'inline-flex';
        if (isOriginNear && distOrigin <= 1.5) {
          proxBadge.className = 'badge badge-proximity-live badge-prox-matched';
          proxBadge.innerHTML = `<i class="fas fa-street-view"></i> Origen a ${distOrigin.toFixed(1)} km`;
        } else if (isRouteNear && distRoute !== Infinity) {
          proxBadge.className = 'badge badge-proximity-live badge-prox-matched';
          const distM = distRoute < 1 ? `${Math.round(distRoute * 1000)} m` : `${distRoute.toFixed(1)} km`;
          proxBadge.innerHTML = `<i class="fas fa-route"></i> Pasa a ${distM} de ti`;
        } else if (isOriginNear) {
          proxBadge.className = 'badge badge-proximity-live badge-prox-matched';
          proxBadge.innerHTML = `<i class="fas fa-location-dot"></i> A ${distOrigin.toFixed(1)} km`;
        } else {
          proxBadge.className = 'badge badge-proximity-live badge-prox-out';
          const minVal = Math.min(distOrigin, distRoute !== Infinity ? distRoute : distOrigin);
          proxBadge.innerHTML = `<i class="fas fa-circle-exclamation"></i> A ${minVal.toFixed(1)} km (Lejano)`;
        }
      }
    } else {
      if (proxBadge) proxBadge.style.display = 'none';
    }

    // 2. Evaluación de Filtros Combinados
    const matchNearby = !isNearbyFilterActive || (currentUserPosition && isNear);
    const matchMyReservations = !isMyReservationsActive || isPassenger;
    const matchMyRides = !isMyRidesActive || isDriver;
    const matchCampus = (selectedCampus === 'all') || cardDest.includes(selectedCampus.toLowerCase());
    const matchPrice = (selectedMaxPrice === Infinity) || (cardCost <= selectedMaxPrice);

    const isVisible = matchNearby && matchMyReservations && matchMyRides && matchCampus && matchPrice;

    if (isVisible) {
      card.style.display = 'flex';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });

  if (counterElement) {
    let textInfo = `<i class="fas fa-filter"></i> Mostrando <strong>${visibleCount}</strong> de <strong>${totalCards}</strong> viajes disponibles`;
    if (isMyReservationsActive) textInfo += ` <span style="color:var(--color-primary); font-weight:600;">(Filtro Mis Reservas)</span>`;
    if (isMyRidesActive) textInfo += ` <span style="color:#2563eb; font-weight:600;">(Filtro Mis Viajes)</span>`;
    counterElement.innerHTML = textInfo;
  }

  // Actualizar contador de filtros activos en el botón desplegable
  let activeFilterCount = 0;
  if (isNearbyFilterActive) activeFilterCount++;
  if (isMyReservationsActive) activeFilterCount++;
  if (isMyRidesActive) activeFilterCount++;
  if (selectedCampus !== 'all') activeFilterCount++;
  if (selectedMaxPrice !== Infinity) activeFilterCount++;

  const badgeCount = document.getElementById('activeFilterBadgeCount');
  const btnToggle = document.getElementById('btnToggleFilterDropdown');
  if (badgeCount) {
    if (activeFilterCount > 0) {
      badgeCount.textContent = activeFilterCount;
      badgeCount.style.display = 'inline-block';
      if (btnToggle) btnToggle.classList.add('active');
    } else {
      badgeCount.style.display = 'none';
      if (btnToggle) btnToggle.classList.remove('active');
    }
  }
}

function initProximityEvents() {
  const btnDetect = document.getElementById('btnDetectPassengerGPS');
  const filterActiveCheckbox = document.getElementById('chkFilterNearbyOnly');
  const filterReservationsCheckbox = document.getElementById('chkFilterMyReservationsOnly');
  const filterRidesCheckbox = document.getElementById('chkFilterMyRidesOnly');
  const campusSelect = document.getElementById('selectCampusDestination');
  const priceSelect = document.getElementById('selectMaxPrice');
  const radiusSelect = document.getElementById('selectProximityRadius');
  const btnToggle = document.getElementById('btnToggleFilterDropdown');
  const menu = document.getElementById('filterDropdownMenu');
  const btnClear = document.getElementById('btnClearAllFilters');

  if (btnToggle && menu) {
    btnToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = menu.style.display === 'block';
      menu.style.display = isVisible ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
      if (menu.style.display === 'block' && !menu.contains(e.target) && !btnToggle.contains(e.target)) {
        menu.style.display = 'none';
      }
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (filterActiveCheckbox) filterActiveCheckbox.checked = false;
      if (filterReservationsCheckbox) filterReservationsCheckbox.checked = false;
      if (filterRidesCheckbox) filterRidesCheckbox.checked = false;
      if (campusSelect) campusSelect.value = 'all';
      if (priceSelect) priceSelect.value = 'all';
      if (radiusSelect) radiusSelect.value = '3';
      updateProximityUIFilter();
    });
  }

  if (btnDetect) {
    btnDetect.addEventListener('click', () => {
      if (!navigator.geolocation) {
        alert('Tu navegador no soporta geolocalización GPS.');
        return;
      }
      btnDetect.disabled = true;
      btnDetect.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Obteniendo GPS...';

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          currentUserPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          try {
            sessionStorage.setItem('uniride_user_gps', JSON.stringify(currentUserPosition));
          } catch (e) { }

          btnDetect.disabled = false;
          btnDetect.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981;"></i> GPS Activo';
          btnDetect.style.borderColor = '#10b981';

          if (filterActiveCheckbox && !filterActiveCheckbox.checked) {
            filterActiveCheckbox.checked = true;
          }

          updateProximityUIFilter();
        },
        (err) => {
          btnDetect.disabled = false;
          btnDetect.innerHTML = '<i class="fas fa-triangle-exclamation"></i> Error GPS';
          console.warn('Error al obtener ubicación:', err);
          alert('No se pudo obtener la ubicación GPS. Verifica los permisos de tu navegador.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    });
  }

  [filterActiveCheckbox, filterReservationsCheckbox, filterRidesCheckbox, campusSelect, priceSelect, radiusSelect].forEach(el => {
    if (el) el.addEventListener('change', updateProximityUIFilter);
  });

  // Restaurar ubicación guardada previamente en sessionStorage para evitar parpadeos
  try {
    const savedGps = sessionStorage.getItem('uniride_user_gps');
    if (savedGps) {
      currentUserPosition = JSON.parse(savedGps);
      if (btnDetect) {
        btnDetect.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981;"></i> GPS Activo';
        btnDetect.style.borderColor = '#10b981';
      }
      updateProximityUIFilter();
    }
  } catch (e) { }

  // Intento de auto-detección silenciosa si el navegador ya otorgó permisos
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      currentUserPosition = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };
      try {
        sessionStorage.setItem('uniride_user_gps', JSON.stringify(currentUserPosition));
      } catch (e) { }
      if (btnDetect) {
        btnDetect.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981;"></i> GPS Activo';
        btnDetect.style.borderColor = '#10b981';
      }
      updateProximityUIFilter();
    }, () => {}, { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initProximityEvents();
});
