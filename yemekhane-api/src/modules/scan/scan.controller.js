const scanService = require('./scan.service');
const { success, error } = require('../../utils/response');

/**
 * POST /api/scan
 */
function scan(req, res, next) {
  try {
    const { barcode, meal_type_id } = req.body;
    const result = scanService.processScan(barcode, meal_type_id, req.user.id);

    const statusCode = result.statusCode;
    delete result.statusCode;

    if (result.success) {
      return res.status(statusCode).json({
        success: true,
        data: result,
        message: result.message,
      });
    } else {
      return res.status(statusCode).json({
        success: false,
        error: result.message,
        data: result,
      });
    }
  } catch (err) {
    next(err);
  }
}

module.exports = { scan };
