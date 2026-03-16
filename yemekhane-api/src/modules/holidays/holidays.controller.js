const holidaysService = require('./holidays.service');
const { success, error } = require('../../utils/response');

function getAll(req, res, next) {
  try {
    const { year } = req.query;
    const holidays = holidaysService.getAll(year);
    return success(res, holidays);
  } catch (err) {
    next(err);
  }
}

function create(req, res, next) {
  try {
    const { date, description } = req.body;
    if (!date || !description) {
      return error(res, 'Tarih ve açıklama gerekli', 400);
    }
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return error(res, 'Tarih formatı YYYY-MM-DD olmalı', 400);
    }
    const holiday = holidaysService.create(date, description);
    return success(res, holiday, 'Tatil günü eklendi', 201);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return error(res, 'Bu tarih zaten tatil olarak tanımlı', 409);
    }
    next(err);
  }
}

function remove(req, res, next) {
  try {
    const existing = holidaysService.getById(req.params.id);
    if (!existing) {
      return error(res, 'Tatil günü bulunamadı', 404);
    }
    holidaysService.remove(req.params.id);
    return success(res, null, 'Tatil günü silindi');
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, create, remove };
