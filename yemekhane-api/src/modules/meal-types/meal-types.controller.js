const mealTypesService = require('./meal-types.service');
const { success, error } = require('../../utils/response');

function getAll(req, res, next) {
  try {
    const mealTypes = mealTypesService.getAll();
    return success(res, mealTypes);
  } catch (err) {
    next(err);
  }
}

function create(req, res, next) {
  try {
    const { name, daily_limit } = req.body;
    const mealType = mealTypesService.create(name, daily_limit);
    return success(res, mealType, 'Yemek tipi oluşturuldu', 201);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return error(res, 'Bu yemek tipi adı zaten mevcut', 409);
    }
    next(err);
  }
}

function update(req, res, next) {
  try {
    const existing = mealTypesService.getById(req.params.id);
    if (!existing) {
      return error(res, 'Yemek tipi bulunamadı', 404);
    }
    const mealType = mealTypesService.update(req.params.id, req.body);
    return success(res, mealType, 'Yemek tipi güncellendi');
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return error(res, 'Bu yemek tipi adı zaten mevcut', 409);
    }
    next(err);
  }
}

module.exports = { getAll, create, update };
