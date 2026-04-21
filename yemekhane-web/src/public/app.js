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
let html5QrCode = null;
let isCameraRunning = false;
let isProcessing = false;   // çift taramayı önler
let todayCount = 0;
let lastScanName = '—';
let overlayTimer = null;
let runtimeSettings = { scanner_input_mode: 'camera', offline_queue_enabled: 'true', offline_queue_max_size: '1000' };

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
const startCameraBtn  = document.getElementById('startCameraBtn');
const stopCameraBtn   = document.getElementById('stopCameraBtn');
const manualBarcode   = document.getElementById('manualBarcode');
const manualScanBtn   = document.getElementById('manualScanBtn');
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
const cameraPlaceholder = document.getElementById('cameraPlaceholder');
const cameraWrapper   = document.querySelector('.camera-wrapper');
const settingsToggleBtn = document.getElementById('settingsToggleBtn');
const settingsPanel = document.getElementById('settingsPanel');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

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
  } catch (e) {
    mealTypeSelect.innerHTML = '<option value="">Yüklenemedi — API çalışıyor mu?</option>';
  }
}

// ── Tarama işlemi ─────────────────────────────────────────────
async function processBarcode(barcode) {
  if (isProcessing) return;
  const meal_type_id = parseInt(mealTypeSelect.value, 10);

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
      showOverlay('success', staff, meal_type, usage, null);
    } else {
      const staff    = data.data?.staff    || null;
      const mealType = data.data?.meal_type || null;
      const usage    = data.data?.usage     || null;
      showOverlay('error', staff, mealType, usage, data.error || 'Bilinmeyen hata');
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
  const mode = runtimeSettings.scanner_input_mode;
  if (mode === 'network') {
    activeAdapter = new window.ScannerAdapters.NetworkScannerAdapter(
      (barcode) => processBarcode(barcode),
      runtimeSettings.scanner_network_endpoint
    );
  } else if (mode === 'serial') {
    activeAdapter = new window.ScannerAdapters.SerialScannerAdapter((barcode) => processBarcode(barcode));
  } else if (mode === 'keyboard') {
    activeAdapter = new window.ScannerAdapters.KeyboardScannerAdapter((barcode) => processBarcode(barcode));
  }
  if (activeAdapter && typeof activeAdapter.start === 'function') activeAdapter.start();
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
    const remaining = usage.monthly_remaining;
    const quotaClass = remaining > 5 ? 'success' : remaining > 1 ? 'warning' : 'danger';
    overlayQuota.innerHTML = `
      <div class="quota-item">
        <span class="quota-num">${usage.monthly_used}</span>
        <span class="quota-lbl">Kullanılan</span>
      </div>
      <div class="quota-divider"></div>
      <div class="quota-item">
        <span class="quota-num ${quotaClass}">${usage.monthly_remaining}</span>
        <span class="quota-lbl">Kalan</span>
      </div>
      <div class="quota-divider"></div>
      <div class="quota-item">
        <span class="quota-num">${usage.monthly_quota}</span>
        <span class="quota-lbl">Toplam</span>
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
  manualBarcode.value = '';
  manualBarcode.focus();
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

// ── Kamera ───────────────────────────────────────────────────
startCameraBtn.addEventListener('click', startCamera);
stopCameraBtn.addEventListener('click', stopCamera);

async function startCamera() {
  if (isCameraRunning) return;

  const mealId = mealTypeSelect.value;
  if (!mealId) {
    alert('Lütfen önce bir yemek tipi seçin.');
    return;
  }

  try {
    html5QrCode = new Html5Qrcode('cameraPreview');

    const config = {
      fps: 10,
      qrbox: { width: 200, height: 140 },
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.UPC_A,
      ],
    };

    await html5QrCode.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        processBarcode(decodedText);
      },
      () => {} // hata sustur
    );

    isCameraRunning = true;
    cameraPlaceholder.classList.add('hidden');
    cameraWrapper.classList.add('scanning');
    startCameraBtn.classList.add('hidden');
    stopCameraBtn.classList.remove('hidden');

  } catch (err) {
    console.error(err);
    alert('Kamera başlatılamadı: ' + (err.message || err));
  }
}

async function stopCamera() {
  if (!isCameraRunning || !html5QrCode) return;

  try {
    await html5QrCode.stop();
    html5QrCode = null;
  } catch (e) { /* sessiz */ }

  isCameraRunning = false;
  cameraPlaceholder.classList.remove('hidden');
  cameraWrapper.classList.remove('scanning');
  startCameraBtn.classList.remove('hidden');
  stopCameraBtn.classList.add('hidden');
}

// ── Manuel giriş ──────────────────────────────────────────────
manualScanBtn.addEventListener('click', () => {
  const barcode = manualBarcode.value.trim();
  if (!barcode) {
    manualBarcode.focus();
    return;
  }
  processBarcode(barcode);
});

// Keyboard wedge okuyucu desteği
manualBarcode.addEventListener('input', () => {
  if (runtimeSettings.scanner_input_mode === 'keyboard' && manualBarcode.value.length >= 6) {
    manualScanBtn.click();
  }
});

manualBarcode.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    manualScanBtn.click();
  }
});

// ── Yemek tipi değişince kamerayı yeniden başlat ──────────────
mealTypeSelect.addEventListener('change', async () => {
  if (isCameraRunning) {
    await stopCamera();
    await startCamera();
  }
});

// ── Sayfa kapanırken kamerayı durdur ──────────────────────────
window.addEventListener('beforeunload', () => {
  if (isCameraRunning && html5QrCode) {
    html5QrCode.stop().catch(() => {});
  }
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
