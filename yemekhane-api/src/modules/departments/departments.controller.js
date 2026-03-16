const departmentsService = require('./departments.service');
const { success, error } = require('../../utils/response');

function getAll(req, res, next) {
  try {
    const departments = departmentsService.getAll();
    return success(res, departments);
  } catch (err) {
    next(err);
  }
}

function create(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return error(res, 'Departman adı gerekli', 400);
    }
    const department = departmentsService.create(name.trim());
    return success(res, department, 'Departman oluşturuldu', 201);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return error(res, 'Bu departman adı zaten mevcut', 409);
    }
    next(err);
  }
}

function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) {
      return error(res, 'Departman adı gerekli', 400);
    }
    const existing = departmentsService.getById(id);
    if (!existing) {
      return error(res, 'Departman bulunamadı', 404);
    }
    const department = departmentsService.update(id, name.trim());
    return success(res, department, 'Departman güncellendi');
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return error(res, 'Bu departman adı zaten mevcut', 409);
    }
    next(err);
  }
}

function remove(req, res, next) {
  try {
    const { id } = req.params;
    const existing = departmentsService.getById(id);
    if (!existing) {
      return error(res, 'Departman bulunamadı', 404);
    }
    departmentsService.remove(id);
    return success(res, null, 'Departman silindi');
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, create, update, remove };
