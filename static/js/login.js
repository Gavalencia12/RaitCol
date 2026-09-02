document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    
    const loginUrl = loginForm.getAttribute('data-login-url') || '/uniride/auth/login/';
    const homeUrl = loginForm.getAttribute('data-home-url') || '/';
    const csrfToken = loginForm.getAttribute('data-csrf');
    
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';
    
    try {
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        window.location.href = homeUrl;
      } else if (data.inactive) {
        window.location.href = `/register/?email=${encodeURIComponent(data.email)}`;
      } else {
        errorMessage.textContent = data.message || 'Error al iniciar sesión';
        errorMessage.style.display = 'block';
      }
    } catch (error) {
      console.error(error);
      errorMessage.textContent = 'Ocurrió un error al conectar con el servidor.';
      errorMessage.style.display = 'block';
    }
  });
});
