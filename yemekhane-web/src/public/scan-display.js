(function () {
  const channel = new BroadcastChannel('scan-events');
  const dialog = document.getElementById('displayDialog');
  const card = document.getElementById('displayDialogCard');
  const iconEl = document.getElementById('displayDialogIcon');
  const nameEl = document.getElementById('displayDialogName');
  const deptEl = document.getElementById('displayDialogDept');
  const mealEl = document.getElementById('displayDialogMeal');
  const msgEl = document.getElementById('displayDialogMessage');
  const manualInput = document.getElementById('displayManualInput');

  let hideTimer = null;

  function showSuccess(payload) {
    clearTimeout(hideTimer);
    card.classList.remove('error', 'warning', 'success');
    card.classList.add('success');
    iconEl.textContent = '✅';
    nameEl.textContent = payload.staff?.full_name || 'Personel';
    deptEl.textContent = payload.staff?.department || '';
    mealEl.textContent = payload.meal_type?.name ? `Öğün: ${payload.meal_type.name}` : '';
    msgEl.textContent = payload.message || 'Giriş başarılı.';
    dialog.classList.remove('hidden');
    hideTimer = setTimeout(() => dialog.classList.add('hidden'), 5000);
  }

  function showError(payload) {
    clearTimeout(hideTimer);
    card.classList.remove('error', 'warning', 'success');
    card.classList.add('error');
    iconEl.textContent = '❌';
    nameEl.textContent = payload.staff?.full_name || 'İşlem Başarısız';
    deptEl.textContent = payload.staff?.department || '';
    mealEl.textContent = payload.meal_type?.name ? `Öğün: ${payload.meal_type.name}` : '';
    msgEl.textContent = payload.message || 'Giriş başarısız.';
    dialog.classList.remove('hidden');
    hideTimer = setTimeout(() => dialog.classList.add('hidden'), 3500);
  }

  channel.onmessage = (ev) => {
    const event = ev.data || {};
    if (event.type === 'scan-success') showSuccess(event.payload || {});
    if (event.type === 'scan-error') showError(event.payload || {});
  };

  // Real flow: send manual barcode to operator screen for actual API scan.
  manualInput?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const barcode = manualInput.value.trim();
    if (!barcode) return;
    channel.postMessage({
      type: 'scan-request',
      payload: { barcode },
    });
    card.classList.remove('error', 'warning', 'success');
    card.classList.add('warning');
    iconEl.textContent = '⏳';
    nameEl.textContent = barcode;
    deptEl.textContent = 'İşlem alındı';
    mealEl.textContent = '';
    msgEl.textContent = 'Operatör ekranında doğrulanıyor...';
    dialog.classList.remove('hidden');
    manualInput.value = '';
  });
})();
