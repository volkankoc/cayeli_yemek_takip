const multer = require('multer');
const { Router } = require('express');
const backupsController = require('./backups.controller');
const { authenticate, requirePermission } = require('../../middleware/auth');
const backupsService = require('./backups.service');

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = backupsService.getBackupDir();
      cb(null, dir);
    },
    filename: (_req, _file, cb) => {
      cb(null, `_upload_${Date.now()}.sqlite`);
    },
  }),
  limits: { fileSize: 512 * 1024 * 1024 },
});

const router = Router();

router.use(authenticate, requirePermission('settings.write'));

router.get('/', backupsController.list);
router.post('/run', backupsController.runNow);
router.get('/download/:filename', backupsController.download);
router.post('/restore', upload.single('file'), backupsController.restore);

module.exports = router;
