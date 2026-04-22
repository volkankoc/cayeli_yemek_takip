const staffService = require('./staff.service');
const { success, error } = require('../../utils/response');

function getAll(req, res, next) {
  try {
    const { department_id, is_active, search, page, limit } = req.query;
    const result = staffService.getAll({
      department_id: department_id ? Number(department_id) : undefined,
      is_active,
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
}

function getById(req, res, next) {
  try {
    const staff = staffService.getById(req.params.id);
    if (!staff) {
      return error(res, 'Personel bulunamadı', 404);
    }
    return success(res, staff);
  } catch (err) {
    next(err);
  }
}

function create(req, res, next) {
  try {
    const staff = staffService.create(req.body, req.user?.id);
    return success(res, staff, 'Personel oluşturuldu', 201);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return error(res, 'Bu barkod zaten mevcut', 409);
    }
    next(err);
  }
}

function update(req, res, next) {
  try {
    const existing = staffService.getById(req.params.id);
    if (!existing) {
      return error(res, 'Personel bulunamadı', 404);
    }
    const staff = staffService.update(req.params.id, req.body, req.user?.id);
    return success(res, staff, 'Personel güncellendi');
  } catch (err) {
    next(err);
  }
}

function remove(req, res, next) {
  try {
    const existing = staffService.getById(req.params.id);
    if (!existing) {
      return error(res, 'Personel bulunamadı', 404);
    }
    staffService.softDelete(req.params.id, req.user?.id);
    return success(res, null, 'Personel pasif yapıldı');
  } catch (err) {
    next(err);
  }
}

function getMealRights(req, res, next) {
  try {
    const existing = staffService.getById(req.params.id);
    if (!existing) {
      return error(res, 'Personel bulunamadı', 404);
    }
    const rights = staffService.getMealRights(req.params.id);
    return success(res, rights);
  } catch (err) {
    next(err);
  }
}

function updateMealRights(req, res, next) {
  try {
    const existing = staffService.getById(req.params.id);
    if (!existing) {
      return error(res, 'Personel bulunamadı', 404);
    }
    const rights = staffService.updateMealRights(req.params.id, req.body.rights, req.user?.id);
    return success(res, rights, 'Yemek hakları güncellendi');
  } catch (err) {
    next(err);
  }
}

function resetMealRights(req, res, next) {
  try {
    const existing = staffService.getById(req.params.id);
    if (!existing) {
      return error(res, 'Personel bulunamadı', 404);
    }
    const rights = staffService.resetMealRights(req.params.id, req.user?.id);
    return success(res, rights, 'Personel yemek hakları sıfırlandı');
  } catch (err) {
    next(err);
  }
}

function bulkImport(req, res, next) {
  try {
    const result = staffService.bulkImport(req.body.staff, req.user?.id);
    return success(res, result, 'Toplu personel içe aktarma tamamlandı');
  } catch (err) {
    next(err);
  }
}

function uploadPhoto(req, res, next) {
  try {
    if (!req.file) {
      return error(res, 'Fotoğraf dosyası gerekli', 400);
    }
    const staff = staffService.savePhoto(req.params.id, req.file, req.user?.id);
    return success(res, staff, 'Fotoğraf yüklendi');
  } catch (err) {
    next(err);
  }
}

function topUpBalance(req, res, next) {
  try {
    const existing = staffService.getById(req.params.id);
    if (!existing) {
      return error(res, 'Personel bulunamadı', 404);
    }
    const updated = staffService.topUpBalance(
      req.params.id,
      req.body.amount,
      req.body.note || '',
      req.user?.id
    );
    return success(res, updated, 'Kontür yüklendi');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getMealRights,
  updateMealRights,
  resetMealRights,
  bulkImport,
  uploadPhoto,
  topUpBalance,
};
