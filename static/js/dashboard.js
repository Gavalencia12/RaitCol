document.addEventListener('DOMContentLoaded', () => {
  // Lógica del menú desplegable de usuario
  const userDropdown = document.getElementById('userDropdown');
  const userDropdownToggle = document.getElementById('userDropdownToggle');

  if (userDropdown && userDropdownToggle) {
    userDropdownToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = userDropdown.classList.contains('active');
      userDropdown.classList.toggle('active');
      userDropdownToggle.setAttribute('aria-expanded', !isActive);
    });

    document.addEventListener('click', (e) => {
      if (!userDropdown.contains(e.target)) {
        userDropdown.classList.remove('active');
        userDropdownToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
  // Abrir modal de publicar viaje
  var modal = document.getElementById("myModal");
  var btn = document.getElementById("myBtn");
  var span = document.getElementsByClassName("close")[0];
  var btnDetectGPS = document.getElementById("btnDetectGPS");
  let createRideMapInstance = null;

  function initCreateRideMap() {
    const container = document.getElementById("createRideMapContainer");
    if (!container) return;

    let mapboxToken = '';
    const tokenElement = document.getElementById('mapbox-token-data');
    if (tokenElement && tokenElement.textContent) {
      try { mapboxToken = JSON.parse(tokenElement.textContent); } catch (e) { }
    }

    const origLat = 19.1158;
    const origLng = -104.3308;
    const destLat = 19.1170;
    const destLng = -104.3985;

    document.getElementById('origen_lat').value = origLat;
    document.getElementById('origen_lng').value = origLng;
    document.getElementById('destino_lat').value = destLat;
    document.getElementById('destino_lng').value = destLng;

    if (mapboxToken && typeof mapboxgl !== 'undefined') {
      mapboxgl.accessToken = mapboxToken;
      if (!createRideMapInstance) {
        try {
          createRideMapInstance = new mapboxgl.Map({
            container: 'createRideMapContainer',
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [origLng, origLat],
            zoom: 13
          });

          // Marcador de Origen
          const elOrig = document.createElement('div');
          elOrig.innerHTML = '<span style="background:#00b865; color:white; padding:3px 8px; border-radius:10px; font-size:10px; font-weight:bold;">📍 Tu Origen</span>';
          const origMarker = new mapboxgl.Marker({ element: elOrig, draggable: true })
            .setLngLat([origLng, origLat])
            .addTo(createRideMapInstance);

          origMarker.on('dragend', () => {
            const lngLat = origMarker.getLngLat();
            document.getElementById('origen_lat').value = lngLat.lat;
            document.getElementById('origen_lng').value = lngLat.lng;
          });

          // Marcador de Destino (FIE)
          const elDest = document.createElement('div');
          elDest.innerHTML = '<span style="background:#0f172a; color:white; padding:3px 8px; border-radius:10px; font-size:10px; font-weight:bold;">🏁 Destino FIE</span>';
          new mapboxgl.Marker({ element: elDest })
            .setLngLat([destLng, destLat])
            .addTo(createRideMapInstance);

        } catch (e) {
          console.warn('Error al crear mapa de publicar viaje:', e);
        }
      } else {
        createRideMapInstance.resize();
      }
    }
  }

  function detectUserGPS() {
    if ('geolocation' in navigator) {
      if (btnDetectGPS) btnDetectGPS.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Detectando GPS...';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          document.getElementById('origen_lat').value = lat;
          document.getElementById('origen_lng').value = lng;
          
          const origInput = document.getElementById('origen');
          if (origInput && !origInput.value) {
            origInput.value = 'Mi Ubicación Actual (GPS)';
          }

          if (createRideMapInstance) {
            createRideMapInstance.flyTo({ center: [lng, lat], zoom: 15 });
          }

          if (btnDetectGPS) btnDetectGPS.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981;"></i> GPS Detectado';
        },
        (err) => {
          console.warn('GPS error:', err.message);
          if (btnDetectGPS) btnDetectGPS.innerHTML = '<i class="fas fa-crosshairs"></i> Detectar mi GPS';
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }

  if (btnDetectGPS) {
    btnDetectGPS.addEventListener('click', detectUserGPS);
  }

  if (btn) {
    btn.onclick = function() {
      if (modal) modal.style.display = "block";
      setTimeout(() => {
        initCreateRideMap();
        detectUserGPS();
      }, 150);
    }
  }

  if (span) {
    span.onclick = function() {
      if (modal) modal.style.display = "none";
    }
  }

  window.onclick = function(event) {
    if (event.target == modal) {
      if (modal) modal.style.display = "none";
    }
  }
  // Abrir modal de publicar viaje
  // Lógica para cerrar sesión
  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', async function() {
    const logoutUrl = logoutBtn.getAttribute('data-logout-url');
    const loginUrl = logoutBtn.getAttribute('data-login-url');
    const csrfToken = logoutBtn.getAttribute('data-csrf');
    
    try {
      const response = await fetch(logoutUrl, {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        window.location.href = loginUrl;
      } else {
        alert('Error al cerrar sesión: ' + (data.message || 'Inténtelo de nuevo.'));
      }
    } catch (error) {
      console.error(error);
      alert('Error al conectar con el servidor.');
    }
  });
    

  
});
