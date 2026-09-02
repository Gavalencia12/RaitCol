document.addEventListener('DOMContentLoaded', () => {
  const segmentedControl = document.getElementById('segmentedControl');
  const tabPersonal = document.getElementById('tabPersonal');
  const tabVehicles = document.getElementById('tabVehicles');
  const viewPersonal = document.getElementById('viewPersonal');
  const viewVehicles = document.getElementById('viewVehicles');

  const btnSwitchToVehicles = document.getElementById('btnSwitchToVehicles');
  const btnInviteToDriver = document.getElementById('btnInviteToDriver');
  const btnSwitchToPersonal = document.getElementById('btnSwitchToPersonal');

  function switchToTab(tabName) {
    if (tabName === 'vehicles') {
      if (segmentedControl) {
        segmentedControl.classList.remove('d-none');
      }

      tabPersonal.classList.remove('active');
      tabVehicles.classList.add('active');

      viewPersonal.classList.remove('active');
      viewPersonal.classList.add('slide-left');

      viewVehicles.classList.remove('slide-right');
      viewVehicles.classList.add('active');
    } else {
      tabVehicles.classList.remove('active');
      tabPersonal.classList.add('active');

      viewVehicles.classList.remove('active');
      viewVehicles.classList.add('slide-right');

      viewPersonal.classList.remove('slide-left');
      viewPersonal.classList.add('active');
    }
  }

  if (tabPersonal && tabVehicles) {
    tabPersonal.addEventListener('click', () => switchToTab('personal'));
    tabVehicles.addEventListener('click', () => switchToTab('vehicles'));
  }

  if (btnSwitchToVehicles) {
    btnSwitchToVehicles.addEventListener('click', (e) => {
      e.preventDefault();
      switchToTab('vehicles');
    });
  }

  if (btnInviteToDriver) {
    btnInviteToDriver.addEventListener('click', (e) => {
      e.preventDefault();
      switchToTab('vehicles');
    });
  }

  if (btnSwitchToPersonal) {
    btnSwitchToPersonal.addEventListener('click', (e) => {
      e.preventDefault();
      switchToTab('personal');
    });
  }
});
