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

//Validar en el cliente que las dos contraseñas nuevas coincidan antes de enviar.
//Mostrar mensajes visuales de éxito o error al completar la modificación.
//

 function checkForm(form)
  {
    if(form.username.value == "") {
      alert("Error: ¡El nombre de usuario no puede estar vacío!");
      form.username.focus();
      return false;
    }
    
     //Asegurar la regla de contraseña: al menos 8 caracteres
    if(form.new_password1.value != "" && form.new_password1.value == form.new_password2.value) {
      if(form.new_password1.value.length < 8) {
        alert("Error: ¡La contraseña debe contener al menos ocho caracteres!");
        form.new_password1.focus();
        return false;
      } 
      //Asegurar la regla de contraseña: no usar el nombre de usuario
      if(form.new_password1.value == form.username.value) {
        alert("Error: ¡La contraseña debe ser diferente del nombre de usuario!");
        form.new_password1.focus();
        return false;
      }
      //Asegurar la regla de contraseña: incluyendo al menos un número
      re = /[0-9]/;  
      if(!re.test(form.new_password1.value)) {
        alert("Error: ¡La contraseña debe contener al menos un número (0-9)!");
        form.new_password1.focus();
        return false;
      }
       //Asegurar la regla de contraseña: una letra minúscula
      re = /[a-z]/;
      if(!re.test(form.new_password1.value)) {
        alert("Error: ¡La contraseña debe contener al menos una letra minúscula (a-z)!");
        form.new_password1.focus();
        return false;
      }
     
    } else {
      alert("Error: ¡Por favor, asegúrate de haber llenado los campos!");
      form.new_password1.focus();
      return false;
    }
    alert("Has introducido una contraseña válida: " + form.new_password1.value);
    return true;
  }
