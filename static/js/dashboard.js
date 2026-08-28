document.addEventListener('DOMContentLoaded', () => {
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
