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

module.exports = { getAll, update };
