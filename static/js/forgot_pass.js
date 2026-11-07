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

  
    const email = document.getElementById('email').value.trim();
    

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
          email
        })
      });

      const data = await response.json();

      if ((response.status === 201 || response.ok) && data.success) {
        registeredEmail = email;
        sentEmailPlaceholder.textContent = email;

        if (data.debug_code) {
          const autoFill = String(data.debug_code);
          if (autoFill.length === 6) {
            codeInputs.forEach((input, idx) => input.value = autoFill[idx]);
          }
        }

        registerForm.style.display = 'none';
        verificationForm.style.display = 'block';

        codeInputs[0].focus();
        startResendTimer();
      } else {
        registerError.textContent = data.message || 'Ocurrió un error en el registro.';
        registerError.style.display = 'block';
      }
    } catch (error) {
      console.error(error||"1");
      registerError.textContent = 'Error al conectar con el servidor2.';
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

    console.log('Hola, JavaScript');

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
      console.log('Hola, JavaScript3');
      

      const data = await response.json();
      //const data1 = await response.text();
      console.log('Hola, JavaScript4');
      //const data = texto ? JSON.parse(data1) : {};
      
      

      if (response.ok && data.success) {
        verifySuccess.textContent = data.message || 'Cuenta verificada con éxito. Redirigiendo...';
        verifySuccess.style.display = 'block';
         console.log('Hola, JavaScript5');
        codeInputs.forEach(input => input.disabled = true);
         console.log('Hola, JavaScript6');
        setTimeout(() => {
          window.location.href = homeUrl;
        }, 1500);
      } else {
         console.log('Hola, JavaScript7');
        verifyError.textContent = data.message || 'Código inválido o expirado.';
        verifyError.style.display = 'block';

        // Limpiar inputs
        codeInputs.forEach(input => input.value = '');
        codeInputs[0].focus();
      }
    } catch (error) {
      console.error(error);
      verifyError.textContent = 'Error al conectar con el servidor1.';
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

        if (data.debug_code) {
          const autoFill = String(data.debug_code);
          if (autoFill.length === 6) {
            codeInputs.forEach((input, idx) => input.value = autoFill[idx]);
          }
        } else {
          codeInputs.forEach(input => input.value = '');
          codeInputs[0].focus();
        }

        startResendTimer();
      } else {
        verifyError.textContent = data.message || 'No se pudo reenviar el código.';
        verifyError.style.display = 'block';
      }
    } catch (error) {
      console.error(error);
      verifyError.textContent = 'Error al conectar con el servidor3.';
      verifyError.style.display = 'block';
    }
  });
});
