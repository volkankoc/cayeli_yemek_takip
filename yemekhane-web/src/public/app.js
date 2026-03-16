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
    const data = await apiFetch('/api/scan', {
      method: 'POST',
      body: JSON.stringify({ barcode: barcode.trim(), meal_type_id }),
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
    showOverlay('error', null, null, null, 'Sunucuya bağlanılamadı.');
  } finally {
    setTimeout(() => { isProcessing = false; }, 1500);
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
});

// ── Başlangıç ─────────────────────────────────────────────────
loadMealTypes();
updateStats();
