document.addEventListener('DOMContentLoaded', () => {
  const requestForm = document.getElementById('forgotRequestForm');
  const verifyForm = document.getElementById('forgotVerifyForm');
  const resetForm = document.getElementById('forgotResetForm');
  if (!requestForm || !verifyForm || !resetForm) return;

  const title = document.getElementById('forgot-title');
  const subtitle = document.getElementById('forgot-subtitle');
  const emailInput = document.getElementById('forgot-email');
  const sentEmail = document.getElementById('forgot-sent-email');
  const codeInputs = [...verifyForm.querySelectorAll('.code-input')];
  const resendButton = document.getElementById('forgot-resend');
  const timer = document.getElementById('forgot-timer');
  const timerSeconds = document.getElementById('forgot-timer-seconds');
  const completeMessage = document.getElementById('forgot-complete');

  let email = '';
  let resendInterval;

  function showMessage(element, message) {
    element.textContent = message;
    element.style.display = 'block';
  }

  function clearMessage(element) {
    element.textContent = '';
    element.style.display = 'none';
  }

  function showStage(activeForm) {
    [requestForm, verifyForm, resetForm].forEach((form) => {
      form.style.display = form === activeForm ? 'flex' : 'none';
    });
  }

  async function postJson(form, url, data) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': form.dataset.csrf
      },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'No se pudo completar la solicitud.');
    }
    return result;
  }

  function startResendTimer() {
    clearInterval(resendInterval);
    let remaining = 60;
    resendButton.disabled = true;
    timer.style.display = 'inline';
    timerSeconds.textContent = remaining;

    resendInterval = setInterval(() => {
      remaining -= 1;
      timerSeconds.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(resendInterval);
        timer.style.display = 'none';
        resendButton.disabled = false;
      }
    }, 1000);
  }

  requestForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const error = document.getElementById('forgot-request-error');
    clearMessage(error);
    email = emailInput.value.trim().toLowerCase();
    const submitButton = requestForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
      const result = await postJson(requestForm, requestForm.dataset.requestUrl, { email });
      sentEmail.textContent = email;
      showStage(verifyForm);
      title.textContent = 'Verifica tu correo';
      subtitle.textContent = result.message;
      showMessage(document.getElementById('forgot-verify-success'), result.message);
      codeInputs[0].focus();
      startResendTimer();
    } catch (requestError) {
      showMessage(error, requestError.message || 'No se pudo enviar el código.');
    } finally {
      submitButton.disabled = false;
    }
  });

  codeInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(-1);
      if (input.value && index < codeInputs.length - 1) {
        codeInputs[index + 1].focus();
      }
      if (codeInputs.every((codeInput) => codeInput.value)) {
        verifyForm.requestSubmit();
      }
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace' && !input.value && index > 0) {
        codeInputs[index - 1].focus();
      }
    });
  });

  codeInputs[0].addEventListener('paste', (event) => {
    const pastedCode = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedCode) return;
    event.preventDefault();
    codeInputs.forEach((input, index) => {
      input.value = pastedCode[index] || '';
    });
    codeInputs[Math.min(pastedCode.length, codeInputs.length - 1)].focus();
    if (pastedCode.length === codeInputs.length) {
      verifyForm.requestSubmit();
    }
  });

  verifyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const error = document.getElementById('forgot-verify-error');
    const success = document.getElementById('forgot-verify-success');
    clearMessage(error);
    clearMessage(success);
    const code = codeInputs.map((input) => input.value).join('');
    if (code.length !== 6) {
      showMessage(error, 'Ingresa los seis dígitos del código.');
      return;
    }

    const submitButton = verifyForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      const result = await postJson(verifyForm, verifyForm.dataset.verifyUrl, { email, code });
      clearInterval(resendInterval);
      showStage(resetForm);
      title.textContent = 'Crea una contraseña nueva';
      subtitle.textContent = result.message;
      document.getElementById('new-password').focus();
    } catch (requestError) {
      showMessage(error, requestError.message || 'El código no es válido o ha vencido.');
      codeInputs.forEach((input) => { input.value = ''; });
      codeInputs[0].focus();
    } finally {
      submitButton.disabled = false;
    }
  });

  resendButton.addEventListener('click', async () => {
    const error = document.getElementById('forgot-verify-error');
    const success = document.getElementById('forgot-verify-success');
    clearMessage(error);
    clearMessage(success);
    resendButton.disabled = true;
    try {
      const result = await postJson(verifyForm, verifyForm.dataset.resendUrl, { email });
      showMessage(success, result.message);
      codeInputs.forEach((input) => { input.value = ''; });
      codeInputs[0].focus();
      startResendTimer();
    } catch (requestError) {
      showMessage(error, requestError.message || 'No se pudo reenviar el código.');
      resendButton.disabled = false;
    }
  });

  resetForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const error = document.getElementById('forgot-reset-error');
    clearMessage(error);
    const password = document.getElementById('new-password').value;
    const passwordConfirmation = document.getElementById('confirm-password').value;
    if (password !== passwordConfirmation) {
      showMessage(error, 'Las contraseñas no coinciden.');
      return;
    }

    const submitButton = resetForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      await postJson(resetForm, resetForm.dataset.resetUrl, {
        password,
        password_confirmation: passwordConfirmation
      });
      clearInterval(resendInterval);
      showStage(null);
      title.textContent = 'Contraseña actualizada';
      subtitle.textContent = 'Ya puedes iniciar sesión con tu nueva contraseña.';
      completeMessage.style.display = 'block';
      document.querySelector('.forgot-back-link').style.display = 'none';
    } catch (requestError) {
      showMessage(error, requestError.message || 'No se pudo actualizar la contraseña.');
    } finally {
      submitButton.disabled = false;
    }
  });
});
