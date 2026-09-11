document.addEventListener('DOMContentLoaded', () => {
  // Global DOM utility helpers
  const $ = (id) => typeof id === 'string' ? document.getElementById(id) : id;

  const on = (target, event, handler) => {
    const el = $(target);
    if (el) el.addEventListener(event, handler);
  };

  const setVal = (id, val) => {
    const el = $(id);
    if (el) el.value = val || '';
  };

  const setDisplay = (id, display) => {
    const el = $(id);
    if (el) {
      if (display === 'none') {
        el.classList.add('d-none');
        el.style.display = 'none';
      } else {
        el.classList.remove('d-none');
        el.style.display = display;
      }
    }
  };

  const toggleVisibility = (containerId, labelTarget, showText, hideText) => {
    const container = $(containerId);
    const label = typeof labelTarget === 'string' ? $(labelTarget) : labelTarget;
    if (!container) return;
    const isHidden = container.style.display === 'none' || container.classList.contains('d-none');
    if (isHidden) {
      container.classList.remove('d-none');
      container.style.display = 'block';
    } else {
      container.classList.add('d-none');
      container.style.display = 'none';
    }
    if (label) label.textContent = isHidden ? hideText : showText;
  };

  // Tab Navigation
  const segmentedControl = $('segmentedControl');
  const tabPersonal = $('tabPersonal');
  const tabVehicles = $('tabVehicles');
  const viewPersonal = $('viewPersonal');
  const viewVehicles = $('viewVehicles');

  function switchToTab(tabName) {
    if (tabName === 'vehicles') {
      if (segmentedControl) segmentedControl.classList.remove('d-none');
      if (tabPersonal) tabPersonal.classList.remove('active');
      if (tabVehicles) tabVehicles.classList.add('active');
      if (viewPersonal) {
        viewPersonal.classList.remove('active');
        viewPersonal.classList.add('slide-left');
      }
      if (viewVehicles) {
        viewVehicles.classList.remove('slide-right');
        viewVehicles.classList.add('active');
      }
    } else {
      if (tabVehicles) tabVehicles.classList.remove('active');
      if (tabPersonal) tabPersonal.classList.add('active');
      if (viewVehicles) {
        viewVehicles.classList.remove('active');
        viewVehicles.classList.add('slide-right');
      }
      if (viewPersonal) {
        viewPersonal.classList.remove('slide-left');
        viewPersonal.classList.add('active');
      }
    }
  }

  on('tabPersonal', 'click', () => switchToTab('personal'));
  on('tabVehicles', 'click', () => switchToTab('vehicles'));
  on('btnSwitchToVehicles', 'click', (e) => { e.preventDefault(); switchToTab('vehicles'); });
  on('btnInviteToDriver', 'click', (e) => { e.preventDefault(); switchToTab('vehicles'); });
  on('btnSwitchToPersonal', 'click', (e) => { e.preventDefault(); switchToTab('personal'); });

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('edit_car') || urlParams.has('new_car') || window.location.hash === '#viewVehicles' || window.location.hash === '#formAddVehicle') {
    switchToTab('vehicles');
    if (window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // Vehicle Form Management
  const formAddVehicle = $('formAddVehicle');

  function showCarForm() {
    setDisplay('formAddVehicle', 'block');
  }

  function hideCarForm() {
    setDisplay('formAddVehicle', 'none');
    const viewVehicles = $('viewVehicles') || document.querySelector('.profile-card');
    if (viewVehicles) viewVehicles.scrollIntoView({ behavior: 'smooth' });
  }

  on('btnCancelCarForm', 'click', (e) => { e.preventDefault(); hideCarForm(); });
  on('btnCloseCarForm', 'click', (e) => { e.preventDefault(); hideCarForm(); });

  on('btnAddVehicle', 'click', () => {
    showCarForm();
    setVal('car_id', 'new');

    const formHeader = $('formAddVehicleHeader');
    if (formHeader) {
      formHeader.innerHTML = '<i class="fa-solid fa-plus" style="color: #16a34a;"></i> Registrar Datos del Auto';
    }

    ['type_car_v', 'mark_car_v', 'model_car_v', 'year_car_i', 'color_car_v', 'plates_car_v', 'seating_car_i', 'lic_user_car_v', 'lic_user_car_base64'].forEach(id => {
      const el = $(id);
      if (el) {
        if (el.type === 'file') el.value = '';
        else if (el.type !== 'hidden' || id === 'lic_user_car_base64') el.value = '';
      }
    });

    const licenceFileInput = $('lic_user_car_v');
    if (licenceFileInput) licenceFileInput.setAttribute('required', 'required');

    const badge = $('licenceStatusBadge');
    if (badge) badge.innerHTML = '<i class="fa-solid fa-file-image"></i> Licencia Seleccionada';

    setDisplay('licenceActionBar', 'none');
    setDisplay('licencePreviewCardContainer', 'none');
    setDisplay('licenceHint', 'block');
    const lblToggle = $('lblToggleLicence');
    if (lblToggle) lblToggle.textContent = 'Ver Licencia';

    if (formAddVehicle) {
      formAddVehicle.scrollIntoView({ behavior: 'smooth' });
      const firstInput = formAddVehicle.querySelector('input:not([type="hidden"])');
      if (firstInput) firstInput.focus();
    }
  });

  document.querySelectorAll('.btn-edit-car').forEach(btn => {
    btn.addEventListener('click', () => {
      showCarForm();
      setVal('car_id', btn.dataset.id);

      const formHeader = $('formAddVehicleHeader');
      if (formHeader) {
        formHeader.innerHTML = '<i class="fa-solid fa-pen" style="color: #16a34a;"></i> Actualizar Datos del Auto';
      }

      setVal('type_car_v', btn.dataset.type);
      setVal('mark_car_v', btn.dataset.mark);
      setVal('model_car_v', btn.dataset.model);
      setVal('year_car_i', btn.dataset.year);
      setVal('color_car_v', btn.dataset.color);
      setVal('plates_car_v', btn.dataset.plates);
      setVal('seating_car_i', btn.dataset.seating);

      const licencePreviewImg = $('licencePreviewImg');
      const licenceFileInput = $('lic_user_car_v');

      if (btn.dataset.licence) {
        setVal('lic_user_car_base64', btn.dataset.licence);
        if (licencePreviewImg) licencePreviewImg.src = btn.dataset.licence;
        const badge = $('licenceStatusBadge');
        if (badge) badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Licencia Guardada';
        setDisplay('licenceActionBar', 'block');
        setDisplay('licenceHint', 'none');
        if (licenceFileInput) licenceFileInput.removeAttribute('required');
      } else {
        setDisplay('licenceActionBar', 'none');
        setDisplay('licenceHint', 'block');
        if (licenceFileInput) licenceFileInput.setAttribute('required', 'required');
      }

      if (formAddVehicle) formAddVehicle.scrollIntoView({ behavior: 'smooth' });
    });
  });

  document.querySelectorAll('.btn-toggle-card-licence').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-target');
      const labelSpan = btn.querySelector('span');
      toggleVisibility(targetId, labelSpan, 'Ver Licencia', 'Ocultar Licencia');
    });
  });

  // Credential Base64 Upload & Live Preview
  on('credential_udc_img', 'change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target.result;
        setVal('credential_udc_base64', base64String);

        const img = $('credentialPreviewImg');
        if (img) img.src = base64String;

        const badge = $('credentialStatusBadge');
        if (badge) badge.innerHTML = '<i class="fa-solid fa-file-image"></i> Credencial Seleccionada';

        setDisplay('credentialActionBar', 'block');
        setDisplay('credentialHint', 'none');

        const avatar = $('profileHeaderAvatar');
        if (avatar) {
          avatar.src = base64String;
          avatar.classList.remove('d-none');
        }
        const icon = $('profileHeaderIcon');
        if (icon) icon.classList.add('d-none');
      };
      reader.readAsDataURL(file);
    }
  });

  on('btnToggleCredentialCard', 'click', (e) => {
    e.preventDefault();
    toggleVisibility('credentialPreviewCardContainer', 'lblToggleCredential', 'Ver Credencial', 'Ocultar Credencial');
  });

  // Driver Licence Base64 Upload & Live Preview
  on('lic_user_car_v', 'change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target.result;
        setVal('lic_user_car_base64', base64String);

        const img = $('licencePreviewImg');
        if (img) img.src = base64String;

        const badge = $('licenceStatusBadge');
        if (badge) badge.innerHTML = '<i class="fa-solid fa-file-image"></i> Licencia Seleccionada';

        setDisplay('licenceActionBar', 'block');
        setDisplay('licenceHint', 'none');
      };
      reader.readAsDataURL(file);
    }
  });

  on('btnToggleLicenceCard', 'click', (e) => {
    e.preventDefault();
    toggleVisibility('licencePreviewCardContainer', 'lblToggleLicence', 'Ver Licencia', 'Ocultar Licencia');
  });

  on('btnToggleRegLicence', 'click', (e) => {
    e.preventDefault();
    toggleVisibility('regLicencePreviewCardContainer', 'lblToggleRegLicence', 'Ver Licencia', 'Ocultar Licencia');
  });
});
