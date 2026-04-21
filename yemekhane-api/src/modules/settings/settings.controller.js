const settingsService = require('./settings.service');
const { success, error } = require('../../utils/response');

function getAll(req, res, next) {
  try {
    const settings = settingsService.getFormatted();
    return success(res, settings);
  } catch (err) {
    next(err);
  }
}

/** Tarama ekranı (kiosk) için; giriş yapmış her kullanıcı okuyabilir. */
function getKiosk(req, res, next) {
  try {
    const all = settingsService.getFormatted();
    const data = {
      kiosk_large_font: all.kiosk_large_font ?? 'false',
      kiosk_high_contrast: all.kiosk_high_contrast ?? 'false',
    };
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

function update(req, res, next) {
  try {
    const body = req.body;
    if (!body || Object.keys(body).length === 0) {
      return error(res, 'Güncellenecek ayar belirtilmedi', 400);
    }
    const settings = settingsService.update(body, req.user?.id);
    return success(res, settings, 'Ayarlar güncellendi');
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getKiosk, update };
