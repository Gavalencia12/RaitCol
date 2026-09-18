function renderSeatsGrid(seatsList = [], role = 'visitor') {
  const container = document.getElementById('seatsGridContainer');
  const template = document.getElementById('seatCardTemplate');
  const subtitle = document.getElementById('seatsHeaderSubtitle');
  if (!container) return;

  container.innerHTML = '';

  const config = MODAL_ROLE_CONFIGS[role] || MODAL_ROLE_CONFIGS.visitor;
  if (subtitle) subtitle.textContent = config.seatsSubtitle;

  if (!seatsList || seatsList.length === 0) {
    const total = currentRideData.totalSeats || 4;
    seatsList = Array.from({ length: total }, (_, i) => ({ seatNumber: i + 1, isTaken: false }));
  }

  seatsList.forEach(seat => {
    let cardNode;
    if (template && template.content) {
      cardNode = template.content.cloneNode(true).firstElementChild;
    } else {
      cardNode = document.createElement('div');
      cardNode.className = 'seat-card-item';
    }

    const numEl = cardNode.querySelector('.seat-num-text');
    const badgeEl = cardNode.querySelector('.seat-badge');
    const nameEl = cardNode.querySelector('.seat-passenger-name');
    const iconEl = cardNode.querySelector('.seat-icon');

    if (numEl) {
      if (role === 'visitor') {
        numEl.textContent = `Asiento #${seat.seatNumber}`;
      } else {
        numEl.textContent = 'Asiento';
      }
    }

    if (seat.isTaken) {
      const isMe = seat.isCurrentUser;
      cardNode.classList.add(isMe ? 'is-me' : 'is-taken');

      if (badgeEl) badgeEl.textContent = isMe ? 'Tu Reserva' : 'Ocupado';
      if (nameEl) {
        const passName = isMe ? `${seat.passengerName || 'Tú'} (Tú)` : (seat.passengerName || 'Reservado');
        nameEl.textContent = passName;
        nameEl.title = passName;
      }
      if (iconEl) iconEl.style.color = isMe ? 'var(--color-primary)' : 'var(--color-driver-primary)';
    } else {
      const isSelected = (currentSelectedSeat === seat.seatNumber);
      if (isSelected && role === 'visitor') cardNode.classList.add('is-selected');

      if (role === 'visitor') {
        cardNode.classList.add('is-selectable');
        cardNode.onclick = () => {
          currentSelectedSeat = seat.seatNumber;
          renderSeatsGrid(currentRideData.seats || seatsList, 'visitor');
          const reserveBtn = document.getElementById('btnReserveSeatAction');
          if (reserveBtn) {
            reserveBtn.innerHTML = `<i class="fas fa-ticket"></i> Reservar Asiento #${seat.seatNumber}`;
          }
        };
        if (badgeEl) {
          badgeEl.textContent = isSelected ? 'Elegido' : 'Libre';
          badgeEl.style.background = isSelected ? 'var(--color-primary)' : 'var(--seat-free-badge-bg)';
          badgeEl.style.color = isSelected ? '#ffffff' : 'var(--seat-free-badge-fg)';
        }
        if (nameEl) {
          nameEl.textContent = isSelected ? '✔ Seleccionado' : 'Clic para elegir';
          nameEl.style.color = isSelected ? 'var(--color-primary)' : 'var(--seat-free-badge-fg)';
        }
      } else {
        if (badgeEl) {
          badgeEl.textContent = 'Libre';
          badgeEl.style.background = 'var(--seat-free-badge-bg)';
          badgeEl.style.color = 'var(--seat-free-badge-fg)';
        }
        if (nameEl) {
          nameEl.textContent = 'Disponible';
          nameEl.style.color = 'var(--seat-free-badge-fg)';
        }
      }

      if (iconEl) iconEl.style.color = 'var(--text-muted)';
    }

    container.appendChild(cardNode);
  });
}
