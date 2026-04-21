const { Router } = require('express');
const multer = require('multer');
const staffController = require('./staff.controller');
const { authenticate, requireAdmin } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { createStaffSchema, updateStaffSchema, updateMealRightsSchema, bulkImportStaffSchema } = require('./staff.schema');

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', authenticate, staffController.getAll);
router.post('/', authenticate, requireAdmin, validate(createStaffSchema), staffController.create);
router.post('/bulk-import', authenticate, requireAdmin, validate(bulkImportStaffSchema), staffController.bulkImport);
router.post('/:id/photo', authenticate, requireAdmin, upload.single('photo'), staffController.uploadPhoto);
router.get('/:id', authenticate, staffController.getById);
router.put('/:id', authenticate, requireAdmin, validate(updateStaffSchema), staffController.update);
router.delete('/:id', authenticate, requireAdmin, staffController.remove);

// Meal rights sub-routes
router.get('/:id/meal-rights', authenticate, staffController.getMealRights);
router.put('/:id/meal-rights', authenticate, requireAdmin, validate(updateMealRightsSchema), staffController.updateMealRights);
router.post('/:id/reset-meal-rights', authenticate, requireAdmin, staffController.resetMealRights);

module.exports = router;
