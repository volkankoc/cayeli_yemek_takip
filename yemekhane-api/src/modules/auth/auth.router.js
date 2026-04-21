const { Router } = require('express');
const authController = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { loginSchema } = require('./auth.schema');
const { loginRateLimit } = require('../../middleware/loginRateLimit');

const router = Router();

router.post('/login', loginRateLimit, validate(loginSchema), authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

module.exports = router;
