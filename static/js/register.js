document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  const verificationForm = document.getElementById('verificationForm');

  if (!registerForm || !verificationForm) return;

  const registerError = document.getElementById('register-error-message');
  const verifyError = document.getElementById('verify-error-message');
  const verifySuccess = document.getElementById('verify-success-message');
  const sentEmailPlaceholder = document.getElementById('sent-email-placeholder');

  const codeInputs = document.querySelectorAll('.code-input');
  const resendLink = document.getElementById('resend-link');
  const timerText = document.querySelector('.timer-text');
  const timerSec = document.getElementById('timer-sec');

  let registeredEmail = '';
  let countdownInterval = null;
  let credentialBase64 = null;

  const credentialFileInput = document.getElementById('credential_udc_file');
  const registerCredentialPreviewContainer = document.getElementById('registerCredentialPreviewContainer');
  const registerCredentialPreviewImg = document.getElementById('registerCredentialPreviewImg');

  if (credentialFileInput) {
    credentialFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          credentialBase64 = event.target.result;
          if (registerCredentialPreviewImg && registerCredentialPreviewContainer) {
            registerCredentialPreviewImg.src = credentialBase64;
            registerCredentialPreviewContainer.style.display = 'block';
          }
        };
        reader.readAsDataURL(file);
      } else {
        credentialBase64 = null;
        if (registerCredentialPreviewContainer) {
          registerCredentialPreviewContainer.style.display = 'none';
        }
      }
    });
  }

  // Verificar si hay un correo en los parámetros de la URL para ir directo a la verificación
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email');
  if (emailParam) {
    registeredEmail = emailParam;
    sentEmailPlaceholder.textContent = emailParam;
    registerForm.style.display = 'none';
    verificationForm.style.display = 'block';
    setTimeout(() => {
      codeInputs[0].focus();
    }, 100);
    startResendTimer();
  }

  // Manejo de focos en los inputs de verificación
  codeInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      const value = e.target.value;
      if (value && index < codeInputs.length - 1) {
        codeInputs[index + 1].focus();
      }

      checkAndSubmitCode();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && index > 0) {
        codeInputs[index - 1].focus();
      }
    });

    // Evitar ingresar caracteres no numéricos
    input.addEventListener('keypress', (e) => {
      if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    });
  });

  codeInputs[0].addEventListener('paste', (e) => {
    e.preventDefault();
    const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
    if (/^\d{6}$/.test(pasteData)) {
      codeInputs.forEach((input, index) => {
        input.value = pasteData[index];
      });
      codeInputs[5].focus();
      checkAndSubmitCode();
    }
  });

  function getVerificationCode() {
    let code = '';
    codeInputs.forEach(input => {
      code += input.value;
    });
    return code;
  }

  function checkAndSubmitCode() {
    const code = getVerificationCode();
    if (code.length === 6) {
      if (typeof verificationForm.requestSubmit === 'function') {
        verificationForm.requestSubmit();
      } else {
        verificationForm.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    }
  }

  function startResendTimer() {
    resendLink.style.display = 'none';
    timerText.style.display = 'block';
    let timeLeft = 60;
    timerSec.textContent = timeLeft;

    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
      timeLeft--;
      timerSec.textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        timerText.style.display = 'none';
        resendLink.style.display = 'inline';
      }
    }, 1000);
  }

  // Envío de Formulario de Registro
  registerForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    registerError.style.display = 'none';
    registerError.textContent = '';

    const first_name = document.getElementById('first_name').value.trim();
    const last_name = document.getElementById('last_name').value.trim();
    const username = document.getElementById('username').value.trim();
    const no_cuenta_v = document.getElementById('no_cuenta_v').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email.endsWith('@ucol.mx')) {
      registerError.textContent = 'El correo debe pertenecer al dominio institucional (@ucol.mx)';
      registerError.style.display = 'block';
      return;
    }

    const registerUrl = registerForm.getAttribute('data-register-url');
    const csrfToken = registerForm.getAttribute('data-csrf');

    try {
      const response = await fetch(registerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({
          first_name,
          last_name,
          username,
          no_cuenta_v,
          email,
          password,
          credential_udc_base64: credentialBase64
        })
      });

      const data = await response.json();

      if ((response.status === 201 || response.ok) && data.success) {
        registeredEmail = email;
        sentEmailPlaceholder.textContent = email;

        registerForm.style.display = 'none';
        verificationForm.style.display = 'block';

        codeInputs[0].focus();

        startResendTimer();
      } else {
        registerError.textContent = data.message || 'Ocurrió un error en el registro.';
        registerError.style.display = 'block';
      }
    } catch (error) {
      console.error(error);
      registerError.textContent = 'Error al conectar con el servidor.';
      registerError.style.display = 'block';
    }
  });

  // Envío de Formulario de Verificación de Código
  verificationForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    verifyError.style.display = 'none';
    verifyError.textContent = '';
    verifySuccess.style.display = 'none';
    verifySuccess.textContent = '';

    const code = getVerificationCode();
    if (code.length !== 6) {
      verifyError.textContent = 'Por favor, ingresa los 6 dígitos del código.';
      verifyError.style.display = 'block';
      return;
    }

    const verifyUrl = verificationForm.getAttribute('data-verify-url');
    const homeUrl = verificationForm.getAttribute('data-home-url') || '/';
    const csrfToken = verificationForm.getAttribute('data-csrf');

    try {
      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({
          email: registeredEmail,
          code: code
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        verifySuccess.textContent = data.message || 'Cuenta verificada con éxito. Redirigiendo...';
        verifySuccess.style.display = 'block';

        codeInputs.forEach(input => input.disabled = true);

        setTimeout(() => {
          window.location.href = homeUrl;
        }, 1500);
      } else {
        verifyError.textContent = data.message || 'Código inválido o expirado.';
        verifyError.style.display = 'block';

        // Limpiar inputs
        codeInputs.forEach(input => input.value = '');
        codeInputs[0].focus();
      }
    } catch (error) {
      console.error(error);
      verifyError.textContent = 'Error al conectar con el servidor.';
      verifyError.style.display = 'block';
    }
  });

  // Reenvío del Código de Verificación
  resendLink.addEventListener('click', async function (e) {
    e.preventDefault();
    verifyError.style.display = 'none';
    verifyError.textContent = '';
    verifySuccess.style.display = 'none';
    verifySuccess.textContent = '';

    const resendUrl = verificationForm.getAttribute('data-resend-url');
    const csrfToken = verificationForm.getAttribute('data-csrf');

    try {
      const response = await fetch(resendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({
          email: registeredEmail
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        verifySuccess.textContent = data.message || 'Se ha reenviado un nuevo código a tu correo.';
        verifySuccess.style.display = 'block';
        startResendTimer();

        codeInputs.forEach(input => input.value = '');
        codeInputs[0].focus();
      } else {
        verifyError.textContent = data.message || 'No se pudo reenviar el código.';
        verifyError.style.display = 'block';
      }
    } catch (error) {
      console.error(error);
      verifyError.textContent = 'Error al conectar con el servidor.';
      verifyError.style.display = 'block';
    }
  });
});
