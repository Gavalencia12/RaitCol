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
  // Obtener el  modal
      var modal = document.getElementById("myModal");

      // Obtén el botón que abre el modal.
      var btn = document.getElementById("myBtn");

      // Get the <span> element that closes the modal
      var span = document.getElementsByClassName("close")[0];

      // When the user clicks on the button, open the modal
      btn.onclick = function() {
        modal.style.display = "block";
      }

      // When the user clicks on <span> (x), close the modal
      span.onclick = function() {
        modal.style.display = "none";
      }

      // When the user clicks anywhere outside of the modal, close it
      window.onclick = function(event) {
        if (event.target == modal) {
          modal.style.display = "none";
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
