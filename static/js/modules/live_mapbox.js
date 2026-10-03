function setupMapboxGLMap() {
  const container = document.getElementById('mapbox-live-map');
  if (!container) return;

  let mapboxToken = '';
  const tokenElement = document.getElementById('mapbox-token-data');
  if (tokenElement && tokenElement.textContent) {
    try {
      const parsedToken = JSON.parse(tokenElement.textContent);
      if (parsedToken && typeof parsedToken === 'string' && parsedToken.trim()) {
        mapboxToken = parsedToken.trim();
      }
    } catch (e) { }
  }

  if (!mapboxToken) {
    renderFallbackVectorMap(container);
    return;
  }

  const originLng = parseCoord(currentRideData.originLng, -104.3308);
  const originLat = parseCoord(currentRideData.originLat, 19.1158);

  if (typeof mapboxgl !== 'undefined') {
    mapboxgl.accessToken = mapboxToken;

    if (!liveMapInstance) {
      try {
        liveMapInstance = new mapboxgl.Map({
          container: 'mapbox-live-map',
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [originLng, originLat],
          zoom: 14,
          attributionControl: false
        });

        const geolocateControl = new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserHeading: true
        });
        liveMapInstance.addControl(geolocateControl, 'bottom-left');

        liveMapInstance.on('error', (e) => {
          console.warn('Error en servicio de mapa Mapbox:', e);
          if (e && e.error && (e.error.status === 401 || e.error.status === 403 || e.error.message?.includes('token') || e.error.message?.includes('401'))) {
            renderFallbackVectorMap(container);
          }
        });

        liveMapInstance.on('load', () => {
          renderRoutePolyline(liveMapInstance, mapboxToken);
          addCustomMapboxMarkers(liveMapInstance);
          getUserRealLocation(liveMapInstance);
          setTimeout(() => {
            try { geolocateControl.trigger(); } catch (e) { }
          }, 300);
        });

      } catch (err) {
        console.warn('Error al cargar Mapbox GL JS:', err);
        renderFallbackVectorMap(container);
      }
    } else {
      liveMapInstance.resize();
      renderRoutePolyline(liveMapInstance, mapboxToken);
      addCustomMapboxMarkers(liveMapInstance);
      getUserRealLocation(liveMapInstance);
    }
  } else {
    renderFallbackVectorMap(container);
  }
}

function getUserRealLocation(map) {
  if (!map || typeof mapboxgl === 'undefined') return;

  const updateMarkerPosition = (lat, lng) => {
    const isDriver = !!(currentRideData.isDriver || (currentRideData.driverId && currentRideData.driverId == currentRideData.currentUserId));

    if (userRealMarker) {
      userRealMarker.remove();
      userRealMarker = null;
    }

    if (isDriver) {
      if (liveDriverMarker) {
        liveDriverMarker.setLngLat([lng, lat]);
      }

      const now = Date.now();
      if (now - lastLocationSendTime > 3000 && currentRideData.id) {
        lastLocationSendTime = now;
        fetch(`/api/journey/${currentRideData.id}/update-location/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driver_lat: lat,
            driver_lng: lng
          })
        }).catch(err => console.warn('Error al transmitir posición GPS del conductor:', err));
      }
    }
  };

  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => updateMarkerPosition(pos.coords.latitude, pos.coords.longitude),
      (err) => console.warn('Obtención rápida de GPS falló/bloqueada:', err.message),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    if (watchPositionId !== null) {
      navigator.geolocation.clearWatch(watchPositionId);
    }

    watchPositionId = navigator.geolocation.watchPosition(
      (pos) => updateMarkerPosition(pos.coords.latitude, pos.coords.longitude),
      (err) => console.warn('Rastreo GPS continuo falló/bloqueado:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  } else {
    console.warn('Geolocalización no soportada en este navegador.');
  }
}

async function renderRoutePolyline(map, token) {
  const originLng = parseCoord(currentRideData.originLng, -104.3308);
  const originLat = parseCoord(currentRideData.originLat, 19.1158);
  const destLng = parseCoord(currentRideData.destLng, -104.3985);
  const destLat = parseCoord(currentRideData.destLat, 19.1170);

  const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng.toFixed(6)},${originLat.toFixed(6)};${destLng.toFixed(6)},${destLat.toFixed(6)}?geometries=geojson&access_token=${token}`;

  try {
    const response = await fetch(directionsUrl);
    const data = await response.json();

    let routeGeoJSON = null;
    if (data.routes && data.routes.length > 0) {
      routeGeoJSON = data.routes[0].geometry;

      const distanceKm = (data.routes[0].distance / 1000).toFixed(1);
      const durationMin = Math.round(data.routes[0].duration / 60);

      const distanceEl = document.getElementById('liveDistanceProgress');
      const etaEl = document.getElementById('liveEtaMinutes');
      if (distanceEl) distanceEl.textContent = `${distanceKm} km recorridos`;
      if (etaEl) etaEl.innerHTML = `${durationMin} <span>min</span>`;
    } else {
      routeGeoJSON = {
        'type': 'LineString',
        'coordinates': [[originLng, originLat], [destLng, destLat]]
      };
    }

    if (map.getSource('route')) {
      map.getSource('route').setData({
        'type': 'Feature',
        'properties': {},
        'geometry': routeGeoJSON
      });
    } else {
      map.addSource('route', {
        'type': 'geojson',
        'data': {
          'type': 'Feature',
          'properties': {},
          'geometry': routeGeoJSON
        }
      });

      map.addLayer({
        'id': 'route-line',
        'type': 'line',
        'source': 'route',
        'layout': {
          'line-join': 'round',
          'line-cap': 'round'
        },
        'paint': {
          'line-color': '#00b865',
          'line-width': 7,
          'line-opacity': 0.95
        }
      });
    }

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([originLng, originLat]);
    bounds.extend([destLng, destLat]);
    map.fitBounds(bounds, { padding: 90, maxZoom: 14.5 });

  } catch (err) {
    console.warn('Usando trazado de coordenadas directo:', err);
  }
}

function addCustomMapboxMarkers(map) {
  const originLng = parseCoord(currentRideData.originLng, -104.3308);
  const originLat = parseCoord(currentRideData.originLat, 19.1158);
  const destLng = parseCoord(currentRideData.destLng, -104.3985);
  const destLat = parseCoord(currentRideData.destLat, 19.1170);

  const originName = currentRideData.origin || 'Origen';
  const destName = currentRideData.destination || 'Destino';
  const driverName = currentRideData.driverName || 'Conductor';

  if (originMarkerInstance) originMarkerInstance.remove();
  if (destinationMarkerInstance) destinationMarkerInstance.remove();
  if (liveDriverMarker) liveDriverMarker.remove();
  if (pickupMarkerInstance) pickupMarkerInstance.remove();

  if (Array.isArray(passengerPickupMarkers)) {
    passengerPickupMarkers.forEach(m => m?.remove?.());
  }
  passengerPickupMarkers = [];

  const elOrigin = document.createElement('div');
  elOrigin.className = 'custom-map-pin origin-pin';
  elOrigin.innerHTML = `<span style="background:#00b865; color:white; padding:4px 10px; border-radius:14px; font-size:11px; font-weight:bold; box-shadow:0 2px 8px rgba(0,0,0,0.2);" title="Origen: ${originName}">📍 ${originName}</span>`;

  originMarkerInstance = new mapboxgl.Marker({ element: elOrigin, draggable: false })
    .setLngLat([originLng, originLat])
    .addTo(map);

  const elDest = document.createElement('div');
  elDest.className = 'custom-map-pin dest-pin';
  elDest.innerHTML = `
    <div style="width:34px; height:34px; background:#0f172a; color:#ffffff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:15px; box-shadow:0 4px 14px rgba(15,23,42,0.5); border:2.5px solid #ffffff; cursor:pointer;" title="Destino: ${destName}">
      <i class="fas fa-location-dot"></i>
    </div>
  `;
  destinationMarkerInstance = new mapboxgl.Marker(elDest).setLngLat([destLng, destLat]).addTo(map);

  const driverLat = parseCoord(currentRideData.driverLat, originLat);
  const driverLng = parseCoord(currentRideData.driverLng, originLng);

  const elCar = document.createElement('div');
  elCar.className = 'custom-map-pin car-pin';
  elCar.innerHTML = `
    <div style="width:38px; height:38px; background:#00b865; color:#ffffff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; box-shadow:0 4px 16px rgba(0,184,101,0.5); border:3px solid #ffffff; cursor:pointer;" title="Vehículo del Conductor: ${driverName}">
      <i class="fas fa-car-side"></i>
    </div>
  `;
  liveDriverMarker = new mapboxgl.Marker(elCar).setLngLat([driverLng, driverLat]).addTo(map);

  // 1. Si es visitante (va a reservar), agregar Marcador de Punto de Encuentro Arrastrable
  const isVisitor = !currentRideData.isDriver && !currentRideData.isPassenger;
  if (isVisitor) {
    setupDraggablePickupMarker(map, originLat, originLng);
  }

  // 2. Renderizar pines de abordaje de pasajeros confirmados en el mapa
  if (Array.isArray(currentRideData.seats)) {
    currentRideData.seats.forEach(seat => {
      if (seat.isTaken && seat.pickupLat && seat.pickupLng) {
        const pLat = parseCoord(seat.pickupLat, null);
        const pLng = parseCoord(seat.pickupLng, null);
        if (pLat !== null && pLng !== null) {
          const elPass = document.createElement('div');
          elPass.className = 'custom-map-pin passenger-pickup-pin';
          elPass.innerHTML = `
            <div style="background:#0284c7; color:#ffffff; padding:4px 10px; border-radius:14px; font-size:11px; font-weight:bold; box-shadow:0 2px 8px rgba(0,0,0,0.25); display:flex; align-items:center; gap:6px;" title="Punto de abordaje: ${seat.passengerName}">
              <i class="fas fa-street-view"></i> ${seat.passengerName}
            </div>
          `;
          const passMarker = new mapboxgl.Marker(elPass).setLngLat([pLng, pLat]).addTo(map);
          passengerPickupMarkers.push(passMarker);
        }
      }
    });
  }
}

function setupDraggablePickupMarker(map, defaultLat, defaultLng) {
  if (!map || typeof mapboxgl === 'undefined') return;

  const latInput = document.getElementById('inputPickupLat');
  const lngInput = document.getElementById('inputPickupLng');
  const nameInput = document.getElementById('inputPickupPointName');

  let initLat = defaultLat;
  let initLng = defaultLng;

  if (latInput) latInput.value = initLat;
  if (lngInput) lngInput.value = initLng;

  const elPickup = document.createElement('div');
  elPickup.className = 'custom-map-pin pickup-draggable-pin';
  elPickup.innerHTML = `
    <div style="background: linear-gradient(135deg, #00b865 0%, #10b981 100%); color:#ffffff; padding:6px 12px; border-radius:20px; font-size:12px; font-weight:800; box-shadow:0 4px 14px rgba(0,184,101,0.45); border:2.5px solid #ffffff; cursor:grab; display:flex; align-items:center; gap:6px;">
      <i class="fas fa-street-view" style="font-size:14px;"></i> 
    </div>
  `;

  pickupMarkerInstance = new mapboxgl.Marker({ element: elPickup, draggable: true })
    .setLngLat([initLng, initLat])
    .addTo(map);

  const reverseGeocodePickup = (lat, lng) => {
    let token = '';
    const tokenElement = document.getElementById('mapbox-token-data');
    if (tokenElement && tokenElement.textContent) {
      try { token = JSON.parse(tokenElement.textContent); } catch (e) { }
    }
    if (!token) return;

    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng.toFixed(6)},${lat.toFixed(6)}.json?access_token=${token}&language=es&types=address,poi,neighborhood,locality`;
    fetch(geocodeUrl)
      .then(res => res.json())
      .then(data => {
        if (data.features && data.features.length > 0) {
          const placeName = data.features[0].place_name_es || data.features[0].place_name;
          if (nameInput) nameInput.value = placeName;
        }
      })
      .catch(err => console.warn('Error al reverse-geocodificar punto de encuentro:', err));
  };

  const onPickupPositionUpdate = (lngLat) => {
    if (latInput) latInput.value = lngLat.lat;
    if (lngInput) lngInput.value = lngLat.lng;
    reverseGeocodePickup(lngLat.lat, lngLat.lng);
  };

  pickupMarkerInstance.on('dragend', () => {
    const lngLat = pickupMarkerInstance.getLngLat();
    onPickupPositionUpdate(lngLat);
  });

  map.on('click', (e) => {
    const isVisitor = !currentRideData.isDriver && !currentRideData.isPassenger;
    if (isVisitor && pickupMarkerInstance) {
      pickupMarkerInstance.setLngLat(e.lngLat);
      onPickupPositionUpdate(e.lngLat);
    }
  });

  reverseGeocodePickup(initLat, initLng);
}

function renderFallbackVectorMap(container) {
  if (!container) return;
  container.innerHTML = `
    <div style="width: 100%; height: 100%; min-height: 320px; background: #f8fafc; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; color: #475569; border: 1px dashed #cbd5e1;">
      <div style="width: 54px; height: 54px; border-radius: 50%; background: #fef2f2; color: #ef4444; display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);">
        <i class="fas fa-triangle-exclamation"></i>
      </div>
      <h4 style="font-size: 16px; font-weight: 700; color: #1e293b; margin: 0 0 6px 0;">Error al cargar el mapa</h4>
      <p style="font-size: 13px; color: #64748b; max-width: 320px; margin: 0 0 16px 0; line-height: 1.4;">
        Ocurrió un problema con el servicio de mapas. Por favor contacte al soporte técnico de UniRide.
      </p>
    </div>
  `;
}
