/**
 * Send a success response
 * @param {import('express').Response} res
 * @param {any} data
 * @param {string} [message]
 * @param {number} [statusCode]
 */
function success(res, data, message = 'İşlem başarılı', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

/**
 * Send an error response
 * @param {import('express').Response} res
 * @param {string} error
 * @param {number} [statusCode]
 * @param {any[]} [details]
 */
function error(res, error, statusCode = 400, details = []) {
  return res.status(statusCode).json({
    success: false,
    error,
    details,
  });
}

module.exports = { success, error };
