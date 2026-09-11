document.getElementById('passwordForm').addEventListener('submit', async function(e) {
    e.preventDefault(); // Evita que la página se recargue

    const form = document.getElementById('passwordForm');
    const formData = new FormData(form);
    const errorMessage = document.getElementById('error-message');
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';

    try {
        
        const response = await fetch(form.action || window.location.href, {
            method: 'POST',
            body: formData,
            headers: {
                // Django requiere el token CSRF en la petición
                'X-CSRFToken': formData.get('csrfmiddlewaretoken')
            }
        });
        //alert('O1.');
        const texto = await response.text();
        //const data = await response.json();
        console.log("Respuesta en texto:", texto);

        // Intenta parsear solo si hay contenido
        const data = texto ? JSON.parse(texto) : {};
       
       
        //alert('O2.');
        if (response.ok && data.success) {
            // Éxito
            //alert('O3.');
           
            errorMessage.textContent  = data.message || 'Contraseña actualizada con éxito.';
            errorMessage.style.display = 'block';
            form.reset(); // Limpia el formulario
        } else {
            // Errores de validación del formulario
            //alert('O4.');
            
           errorMessage.textContent  = data.errors || 'Hubo un error al cambiar la contraseña.';
           errorMessage.style.display = 'block';
        }
    } catch (error) {
        console.error(error);
        alert('Ocurrió un error inesperado de red.');
         errorMessage.textContent = 'Ocurrió un error al conectar con el servidor.';
      errorMessage.style.display = 'block';
    }
});
