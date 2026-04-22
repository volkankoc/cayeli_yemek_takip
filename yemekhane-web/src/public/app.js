/* ============================================================
   yemekhane-web / app.js
   Tarama sayfası (scan.html) için tüm frontend logic
   ============================================================ */

// ── Auth kontrolü ────────────────────────────────────────────
const token = sessionStorage.getItem('token');
const user  = JSON.parse(sessionStorage.getItem('user') || 'null');

if (!token) {
  window.location.href = '/';
}

// ── Kullanıcı bilgisi ─────────────────────────────────────────
const userInfoEl = document.getElementById('userInfo');
if (user && userInfoEl) {
  userInfoEl.textContent = `${user.username} (${user.role})`;
}

// ── Logout ────────────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.clear();
  window.location.href = '/';
});

// ── Değişkenler ───────────────────────────────────────────────
let isProcessing = false;   // çift taramayı önler
let todayCount = 0;
let lastScanName = '—';
let overlayTimer = null;
let runtimeSettings = { scanner_input_mode: 'camera', offline_queue_enabled: 'true', offline_queue_max_size: '1000' };
const scanChannel = new BroadcastChannel('scan-events');
let keyboardBuffer = '';
let keyboardBufferTimer = null;
const scanHistory = [];

async function loadKioskDisplay() {
  try {
    const data = await apiFetch('/api/settings/kiosk');
    if (!data.success || !data.data) return;
    const b = document.body;
    b.classList.toggle('kiosk-large-font', data.data.kiosk_large_font === 'true');
    b.classList.toggle('kiosk-high-contrast', data.data.kiosk_high_contrast === 'true');
  } catch {
    /* sessiz */
  }
}
const OFFLINE_QUEUE_KEY = 'offline_scan_queue_v1';
let activeAdapter = null;

// ── DOM refs ──────────────────────────────────────────────────
const mealTypeSelect  = document.getElementById('mealTypeSelect');
const resultPanel     = document.getElementById('resultPanel');
const resultOverlay   = document.getElementById('resultOverlay');
const overlayCard     = document.getElementById('overlayCard');
const overlayIcon     = document.getElementById('overlayIcon');
const overlayName     = document.getElementById('overlayName');
const overlayDept     = document.getElementById('overlayDept');
const overlayMeal     = document.getElementById('overlayMeal');
const overlayQuota    = document.getElementById('overlayQuota');
const overlayMessage  = document.getElementById('overlayMessage');
const overlayClose    = document.getElementById('overlayClose');
const overlayCountdown = document.getElementById('overlayCountdown');
const statToday       = document.getElementById('statToday');
const statLastScan    = document.getElementById('statLastScan');
const staffPhotoPreview = document.getElementById('staffPhotoPreview');
const staffPhotoPlaceholder = document.getElementById('staffPhotoPlaceholder');
const settingsToggleBtn = document.getElementById('settingsToggleBtn');
const settingsPanel = document.getElementById('settingsPanel');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const cancelLastBtn = document.getElementById('cancelLastBtn');
const openDisplayBtn = document.getElementById('openDisplayBtn');
const sessionPickerOverlay = document.getElementById('sessionPickerOverlay');
const sessionMealButtons = document.getElementById('sessionMealButtons');
const sessionMealChip = document.getElementById('sessionMealChip');
const scanHistoryList = document.getElementById('scanHistoryList');
let selectedSessionMealTypeId = null;

// ── API yardımcı ──────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch('/proxy' + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  return data;
}

function loadQueue() {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveQueue(items) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
}

function enqueueOfflineScan(payload) {
  const queue = loadQueue();
  const maxSize = parseInt(runtimeSettings.offline_queue_max_size || '1000', 10);
  queue.push({ id: `${Date.now()}-${Math.random()}`, payload, createdAt: new Date().toISOString() });
  if (queue.length > maxSize) queue.splice(0, queue.length - maxSize);
  saveQueue(queue);
}

async function syncOfflineQueue() {
  if (!navigator.onLine) return;
  const queue = loadQueue();
  if (!queue.length) return;
  const pending = [];
  for (const item of queue) {
    try {
      const resp = await apiFetch('/api/scan', {
        method: 'POST',
        body: JSON.stringify(item.payload),
      });
      if (!resp.success) pending.push(item);
    } catch {
      pending.push(item);
    }
  }
  saveQueue(pending);
}

// ── Yemek tiplerini yükle ─────────────────────────────────────
async function loadMealTypes() {
  try {
    const data = await apiFetch('/api/meal-types');
    mealTypeSelect.innerHTML = '';

    if (!data.success || !data.data.length) {
      mealTypeSelect.innerHTML = '<option value="">Yemek tipi bulunamadı</option>';
      return;
    }

    const active = data.data.filter(m => m.is_active);
    active.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      mealTypeSelect.appendChild(opt);
    });
    renderSessionPicker(active);
  } catch (e) {
    mealTypeSelect.innerHTML = '<option value="">Yüklenemedi — API çalışıyor mu?</option>';
    if (sessionMealButtons) {
      sessionMealButtons.innerHTML = '<p class="text-danger">Yemek tipleri yüklenemedi.</p>';
    }
  }
}

function renderSessionPicker(activeMealTypes) {
  if (!sessionMealButtons || !sessionPickerOverlay) return;
  sessionMealButtons.innerHTML = '';
  if (!activeMealTypes.length) {
    sessionMealButtons.innerHTML = '<p class="text-danger">Aktif yemek tipi bulunamadı.</p>';
    return;
  }
  activeMealTypes.forEach((mt) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'session-meal-btn';
    btn.textContent = mt.name;
    btn.addEventListener('click', () => {
      selectedSessionMealTypeId = Number(mt.id);
      mealTypeSelect.value = String(mt.id);
      sessionPickerOverlay.classList.add('hidden');
      if (sessionMealChip) sessionMealChip.textContent = `Oturum: ${mt.name}`;
    });
    sessionMealButtons.appendChild(btn);
  });
}

// ── Tarama işlemi ─────────────────────────────────────────────
async function processBarcode(barcode) {
  if (isProcessing) return;
  const meal_type_id = selectedSessionMealTypeId || parseInt(mealTypeSelect.value, 10);

  if (!meal_type_id) {
    showOverlay('warning', null, null, null, 'Lütfen önce bir yemek tipi seçin.');
    isProcessing = false;
    return;
  }

  isProcessing = true;

  try {
    const payload = { barcode: barcode.trim(), meal_type_id };
    const data = await apiFetch('/api/scan', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (data.success) {
      const { staff, meal_type, usage } = data.data;
      todayCount++;
      lastScanName = staff.full_name;
      updateStats();
      updateProfilePreview(staff);
      addHistoryRow({
        ok: true,
        usageLogId: Number(data.data?.usage_log_id || 0),
        staffName: staff.full_name,
        mealName: meal_type?.name || '',
        message: data.message || 'Başarılı',
        canceled: false,
      });
      showOverlay('success', staff, meal_type, usage, null);
      scanChannel.postMessage({
        type: 'scan-success',
        payload: {
          staff,
          meal_type,
          usage,
          message: data.message || 'Giriş başarılı.',
        },
      });
    } else {
      const staff    = data.data?.staff    || null;
      const mealType = data.data?.meal_type || null;
      const usage    = data.data?.usage     || null;
      if (staff) updateProfilePreview(staff);
      addHistoryRow({
        ok: false,
        usageLogId: 0,
        staffName: staff?.full_name || 'Bilinmiyor',
        mealName: mealType?.name || '',
        message: data.error || 'Hata',
        canceled: false,
      });
      showOverlay('error', staff, mealType, usage, data.error || 'Bilinmeyen hata');
      scanChannel.postMessage({
        type: 'scan-error',
        payload: {
          staff,
          meal_type: mealType,
          usage,
          message: data.error || 'İşlem başarısız.',
        },
      });
    }
  } catch (e) {
    if (runtimeSettings.offline_queue_enabled === 'true') {
      enqueueOfflineScan({ barcode: barcode.trim(), meal_type_id });
      showOverlay('warning', null, null, null, 'Bağlantı yok. Okutma offline kuyruğa alındı.');
    } else {
      showOverlay('error', null, null, null, 'Sunucuya bağlanılamadı.');
    }
  } finally {
    setTimeout(() => { isProcessing = false; }, 1500);
  }
}

scanChannel.onmessage = (ev) => {
  const event = ev.data || {};
  if (event.type !== 'scan-request') return;
  const barcode = String(event.payload?.barcode || '').trim();
  if (!barcode) return;
  processBarcode(barcode);
};

async function loadSettingsPanel() {
  if (!user || user.role !== 'admin') return;
  settingsToggleBtn.classList.remove('hidden');
  const data = await apiFetch('/api/settings');
  if (!data.success) return;
  runtimeSettings = { ...runtimeSettings, ...data.data };
  const map = {
    set_system_name: 'system_name',
    set_monthly_quota: 'monthly_quota',
    set_scan_cooldown_minutes: 'scan_cooldown_minutes',
    set_allowed_barcode_formats: 'allowed_barcode_formats',
    set_login_max_attempts: 'login_max_attempts',
    set_offline_queue_max_size: 'offline_queue_max_size',
    set_scanner_input_mode: 'scanner_input_mode',
    set_report_default_range_days: 'report_default_range_days',
    set_enable_metrics: 'enable_metrics',
  };
  for (const [elId, key] of Object.entries(map)) {
    const el = document.getElementById(elId);
    if (el) el.value = data.data[key] ?? '';
  }
  setupAdapter();
}

async function saveSettingsPanel() {
  const payload = {
    system_name: document.getElementById('set_system_name').value.trim(),
    monthly_quota: document.getElementById('set_monthly_quota').value,
    scan_cooldown_minutes: document.getElementById('set_scan_cooldown_minutes').value,
    allowed_barcode_formats: document.getElementById('set_allowed_barcode_formats').value.trim(),
    login_max_attempts: document.getElementById('set_login_max_attempts').value,
    offline_queue_max_size: document.getElementById('set_offline_queue_max_size').value,
    scanner_input_mode: document.getElementById('set_scanner_input_mode').value,
    report_default_range_days: document.getElementById('set_report_default_range_days').value,
    enable_metrics: document.getElementById('set_enable_metrics').value,
  };
  const data = await apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(payload) });
  if (data.success) {
    runtimeSettings = { ...runtimeSettings, ...data.data };
    setupAdapter();
    alert('Ayarlar güncellendi.');
  } else {
    alert(data.error || 'Ayar kaydedilemedi.');
  }
}

function setupAdapter() {
  if (activeAdapter && typeof activeAdapter.stop === 'function') activeAdapter.stop();
  activeAdapter = null;
  if (runtimeSettings.scanner_input_mode === 'keyboard') {
    activeAdapter = new window.ScannerAdapters.KeyboardScannerAdapter((barcode) => processBarcode(barcode));
  }
  if (activeAdapter && typeof activeAdapter.start === 'function') activeAdapter.start();
}

function updateProfilePreview(staff) {
  const photo = staff?.photo_url
    ? (staff.photo_url.startsWith('/') ? `/proxy${staff.photo_url}` : staff.photo_url)
    : null;
  if (photo) {
    staffPhotoPreview.src = photo;
    staffPhotoPreview.classList.remove('hidden');
    staffPhotoPlaceholder.classList.add('hidden');
  } else {
    staffPhotoPreview.classList.add('hidden');
    staffPhotoPlaceholder.classList.remove('hidden');
    staffPhotoPlaceholder.textContent = 'Profil resmi yok';
  }
}

function addHistoryRow(item) {
  scanHistory.unshift({
    at: new Date(),
    ...item,
  });
  if (scanHistory.length > 100) scanHistory.length = 100;
  renderHistory();
}

function renderHistory() {
  if (!scanHistoryList) return;
  scanHistoryList.innerHTML = '';
  if (!scanHistory.length) {
    scanHistoryList.innerHTML = '<li class="scan-history-item muted">Henüz okutma yok.</li>';
    return;
  }
  scanHistory.forEach((row) => {
    const li = document.createElement('li');
    li.className = `scan-history-item ${row.ok ? 'ok' : 'err'}`;
    const canCancel = row.ok && !row.canceled && Number(row.usageLogId || 0) > 0;
    li.innerHTML = `
      <div class="scan-history-main">
        <span class="scan-history-name">${row.staffName}</span>
        <span class="scan-history-time">${row.at.toLocaleTimeString('tr-TR')}</span>
      </div>
      <div class="scan-history-sub">${row.mealName ? `${row.mealName} · ` : ''}${row.message}</div>
      ${canCancel
        ? `<button class="scan-history-cancel-btn" data-usage-id="${row.usageLogId}">İptal Et</button>`
        : row.canceled
          ? '<span class="scan-history-canceled">İptal edildi</span>'
          : ''}
    `;
    scanHistoryList.appendChild(li);
  });
}

async function cancelByUsageId(usageLogId) {
  try {
    const res = await apiFetch('/api/scan/cancel', {
      method: 'POST',
      body: JSON.stringify({ usage_log_id: Number(usageLogId) }),
    });
    if (!res.success) {
      showOverlay('warning', null, null, null, res.error || 'İptal edilemedi.');
      return;
    }
    const canceled = res.data?.canceled;
    scanHistory.forEach((row) => {
      if (Number(row.usageLogId) === Number(usageLogId)) {
        row.canceled = true;
        row.message = 'Operatör tarafından iptal edildi';
      }
    });
    renderHistory();
    const staff = canceled?.staff
      ? {
          id: canceled.staff.id,
          full_name: canceled.staff.full_name,
          department: canceled.staff.department,
        }
      : null;
    showOverlay('warning', staff, null, null, res.message || 'İşlem iptal edildi.');
    scanChannel.postMessage({
      type: 'scan-error',
      payload: {
        staff,
        message: 'Son işlem operatör tarafından iptal edildi.',
      },
    });
  } catch {
    showOverlay('warning', null, null, null, 'Sunucuya ulaşılamadı, işlem iptal edilemedi.');
  }
}

// ── Overlay göster ────────────────────────────────────────────
function showOverlay(type, staff, mealType, usage, message) {
  clearTimeout(overlayTimer);

  // Kart tipi sınıflarını temizle
  overlayCard.classList.remove('success', 'error', 'warning');
  overlayCard.classList.add(type);

  // İkon
  const icons = { success: '✅', error: '❌', warning: '⚠️' };
  overlayIcon.textContent = icons[type] || '❓';

  // Personel bilgisi
  if (staff) {
    overlayName.textContent = staff.full_name || '—';
    overlayDept.textContent = staff.department || '';
  } else {
    overlayName.textContent = type === 'error' ? 'Personel Bulunamadı' : '';
    overlayDept.textContent = '';
  }

  // Yemek tipi
  overlayMeal.textContent = mealType ? mealType.name : '';
  overlayMeal.style.display = mealType ? 'inline-block' : 'none';

  // Kota bilgisi
  if (usage) {
    const balanceAfter = Number(usage.balance_after ?? 0);
    const debitAmount = Number(usage.debit_amount ?? 1);
    const quotaClass = balanceAfter > 50 ? 'success' : balanceAfter > 10 ? 'warning' : 'danger';
    overlayQuota.innerHTML = `
      <div class="quota-item">
        <span class="quota-num">${Number(usage.balance_before ?? 0).toFixed(2)}</span>
        <span class="quota-lbl">Önceki</span>
      </div>
      <div class="quota-divider"></div>
      <div class="quota-item">
        <span class="quota-num">${debitAmount.toFixed(0)}</span>
        <span class="quota-lbl">Düşüm</span>
      </div>
      <div class="quota-divider"></div>
      <div class="quota-item">
        <span class="quota-num ${quotaClass}">${balanceAfter.toFixed(2)}</span>
        <span class="quota-lbl">Bakiye</span>
      </div>
    `;
    overlayQuota.style.display = 'flex';
  } else {
    overlayQuota.style.display = 'none';
  }

  // Mesaj
  overlayMessage.textContent = message || (type === 'success' ? 'Yemek kaydı başarıyla oluşturuldu.' : '');

  resultOverlay.classList.remove('hidden');

  // Tüm tipler otomatik kapanır: başarı 3sn, hata/uyarı 2sn
  const autoCloseSec = type === 'success' ? 3 : 2;
  let sec = autoCloseSec;
  overlayCountdown.textContent = `${sec} saniye sonra kapanır`;
  overlayTimer = setInterval(() => {
    sec--;
    if (sec <= 0) {
      clearInterval(overlayTimer);
      closeOverlay();
    } else {
      overlayCountdown.textContent = `${sec} saniye sonra kapanır`;
    }
  }, 1000);
}

function closeOverlay() {
  clearInterval(overlayTimer);
  resultOverlay.classList.add('hidden');
}

overlayClose.addEventListener('click', closeOverlay);
resultOverlay.addEventListener('click', (e) => {
  if (e.target === resultOverlay) closeOverlay();
});

// ── İstatistik güncelle ───────────────────────────────────────
function updateStats() {
  statToday.textContent = todayCount;
  statLastScan.textContent = lastScanName.length > 16
    ? lastScanName.substring(0, 14) + '…'
    : lastScanName;
}

openDisplayBtn?.addEventListener('click', () => {
  window.open('/scan-display', '_blank', 'noopener,noreferrer');
});

cancelLastBtn?.addEventListener('click', async () => {
  try {
    const meal_type_id = parseInt(mealTypeSelect.value, 10) || undefined;
    const res = await apiFetch('/api/scan/cancel-last', {
      method: 'POST',
      body: JSON.stringify(meal_type_id ? { meal_type_id } : {}),
    });
    if (res.success) {
      const staff = res.data?.canceled?.staff
        ? {
            id: res.data.canceled.staff.id,
            full_name: res.data.canceled.staff.full_name,
            department: res.data.canceled.staff.department,
          }
        : null;
      showOverlay('warning', staff, null, null, res.message || 'Son işlem iptal edildi.');
      scanChannel.postMessage({
        type: 'scan-error',
        payload: {
          staff,
          message: 'Son işlem operatör tarafından iptal edildi.',
        },
      });
    } else {
      showOverlay('warning', null, null, null, res.error || 'İptal edilemedi.');
    }
  } catch {
    showOverlay('warning', null, null, null, 'Sunucuya ulaşılamadı, işlem iptal edilemedi.');
  }
});

scanHistoryList?.addEventListener('click', (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  const usageId = target.getAttribute('data-usage-id');
  if (!usageId) return;
  cancelByUsageId(Number(usageId));
});

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'TEXTAREA') return;

  if (e.key === 'Enter') {
    if (keyboardBuffer.trim().length >= 4) {
      processBarcode(keyboardBuffer.trim());
    }
    keyboardBuffer = '';
    if (keyboardBufferTimer) clearTimeout(keyboardBufferTimer);
    return;
  }

  if (e.key.length === 1) {
    keyboardBuffer += e.key;
    if (keyboardBuffer.length > 64) keyboardBuffer = keyboardBuffer.slice(-64);
    if (keyboardBufferTimer) clearTimeout(keyboardBufferTimer);
    keyboardBufferTimer = setTimeout(() => {
      keyboardBuffer = '';
    }, 220);
  }
});

window.addEventListener('beforeunload', () => {
  if (activeAdapter && typeof activeAdapter.stop === 'function') activeAdapter.stop();
});

window.addEventListener('online', syncOfflineQueue);
setInterval(syncOfflineQueue, 15000);

settingsToggleBtn?.addEventListener('click', () => {
  settingsPanel.classList.toggle('hidden');
});
saveSettingsBtn?.addEventListener('click', saveSettingsPanel);

function loadScanAppVersion() {
  fetch('/version.json')
    .then((r) => r.json())
    .then((d) => {
      const el = document.getElementById('scanAppVersion');
      if (!el || !d.version) return;
      el.textContent = 'v' + d.version;
      if (d.releaseNotes) el.title = d.releaseNotes;
    })
    .catch(() => {});
}

// ── Başlangıç ─────────────────────────────────────────────────
loadScanAppVersion();
loadMealTypes();
updateStats();
loadKioskDisplay();
loadSettingsPanel();
syncOfflineQueue();
renderHistory();
