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
