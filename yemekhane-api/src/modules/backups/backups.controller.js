const path = require('path');
const fs = require('fs');
const backupsService = require('./backups.service');
const { success, error } = require('../../utils/response');

function list(req, res, next) {
  try {
    const items = backupsService.listBackups();
    return success(res, items);
  } catch (err) {
    next(err);
  }
}

function runNow(req, res, next) {
  try {
    const created = backupsService.createBackupFile('manual', req.user?.id);
    return success(res, created, 'Yedek oluşturuldu');
  } catch (err) {
    next(err);
  }
}

function download(req, res, next) {
  try {
    const { filename } = req.params;
    const full = backupsService.resolveBackupPath(filename);
    return res.download(full, filename);
  } catch (err) {
    next(err);
  }
}

function restore(req, res, next) {
  try {
    if (!req.file?.path) {
      return error(res, 'SQLite dosyası yüklenmedi', 400);
    }
    const uploaded = req.file.path;
    try {
      backupsService.stageRestore(uploaded, req.user?.id);
    } finally {
      try {
        fs.unlinkSync(uploaded);
      } catch {
        /* tmp temizliği */
      }
    }
    return success(
      res,
      { restartRequired: true },
      'Geri yükleme dosyası kaydedildi. Değişikliğin uygulanması için API sunucusunu yeniden başlatın.'
    );
  } catch (err) {
    next(err);
  }
}

module.exports = { list, runNow, download, restore };
