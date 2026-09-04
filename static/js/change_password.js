document.addEventListener('DOMContentLoaded', () => {
    // Inicializar los iconos de Lucide
   

    const passwordForm = document.getElementById('passwordForm');
    const old_password = document.getElementById('old_password');
    const new_password1 = document.getElementById('new_password1');
    const new_password2 = document.getElementById('new_password2');
    const alertMessage = document.getElementById('alertMessage');

    // Elementos de requisitos de validación
    const reqLength = document.getElementById('reqLength');
    const reqUppercase = document.getElementById('reqUppercase');
    const reqNumber = document.getElementById('reqNumber');
    const reqSpecial = document.getElementById('reqSpecial');
    const reqMatch = document.getElementById('reqMatch');

    
    // 2. Funciones de validación en tiempo real
    function validateNewPassword() {
        const value = new_password1.value;

        const hasLength = value.length >= 8;
        const hasUppercase = /[A-Z]/.test(value);
        const hasNumber = /[0-9]/.test(value);
        const hasSpecial = /[@$!%*?&]/.test(value);

        updateRequirementStatus(reqLength, hasLength);
        updateRequirementStatus(reqUppercase, hasUppercase);
        updateRequirementStatus(reqNumber, hasNumber);
        updateRequirementStatus(reqSpecial, hasSpecial);

        validateConfirmPassword();

        return hasLength && hasUppercase && hasNumber && hasSpecial;
    }

    function validateConfirmPassword() {
        const matches = new_password1.value === new_password2.value && new_password2.value !== '';
        updateRequirementStatus(reqMatch, matches);
        return matches;
    }

    function updateRequirementStatus(element, isValid) {
        if (isValid) {
            element.classList.remove('invalid');
            element.classList.add('valid');
        } else {
            element.classList.remove('valid');
            element.classList.add('invalid');
        }
    }

    // Escuchadores de eventos para los inputs
    new_password1.addEventListener('input', validateNewPassword);
    new_password2.addEventListener('input', validateConfirmPassword);

    // 3. Manejo del Envío del Formulario
    passwordForm.addEventListener('submit', function(e) {
        e.preventDefault();

        alertMessage.style.display = 'none';
        alertMessage.className = 'alert';

        if (old_password.value.trim() === '') {
            showAlert('Por favor, ingresa tu contraseña actual.', 'error');
            return;
        }

        const isNewPasswordSecure = validateNewPassword();
        const doPasswordsMatch = validateConfirmPassword();

        if (!isNewPasswordSecure) {
            showAlert('La nueva contraseña no cumple con todos los requisitos de seguridad.', 'error');
            return;
        }

        if (!doPasswordsMatch) {
            showAlert('La confirmación de la contraseña no coincide.', 'error');
            return;
        }

        showAlert('¡Contraseña actualizada con éxito! (Enviando al servidor...)', 'success');
        
        console.log('Datos listos para la API:', {
            current: old_password.value,
            new: new_password1.value
        });

        passwordForm.reset();
        resetRequirements();
        resetPasswordVisibility();
    });

    function showAlert(message, type) {
        alertMessage.textContent = message;
        alertMessage.style.display = 'block';
        alertMessage.classList.add(type === 'success' ? 'alert-success' : 'alert-error');
    }

    function resetRequirements() {
        const items = document.querySelectorAll('.requirements li');
        items.forEach(item => {
            item.classList.remove('valid');
            item.classList.add('invalid');
        });
    }

    // Devuelve los inputs al tipo password por defecto tras enviar el formulario
    function resetPasswordVisibility() {
        const inputs = document.querySelectorAll('.password-wrapper input');
        inputs.forEach(input => input.type = 'password');
        
       
    }
});