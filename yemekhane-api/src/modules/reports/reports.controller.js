const reportsService = require('./reports.service');
const { success, error } = require('../../utils/response');

function daily(req, res, next) {
  try {
    const { date } = req.query;
    const report = reportsService.getDailyReport(date);
    return success(res, report);
  } catch (err) {
    next(err);
  }
}

function monthly(req, res, next) {
  try {
    const { year, month } = req.query;
    const report = reportsService.getMonthlyReport(
      year ? Number(year) : undefined,
      month ? Number(month) : undefined
    );
    return success(res, report);
  } catch (err) {
    next(err);
  }
}

function yearly(req, res, next) {
  try {
    const { year } = req.query;
    const report = reportsService.getYearlyReport(year ? Number(year) : undefined);
    return success(res, report);
  } catch (err) {
    next(err);
  }
}

function staffReport(req, res, next) {
  try {
    const { id } = req.params;
    const { year, month } = req.query;
    const report = reportsService.getStaffReport(
      id,
      year ? Number(year) : undefined,
      month ? Number(month) : undefined
    );
    if (!report) {
      return error(res, 'Personel bulunamadı', 404);
    }
    return success(res, report);
  } catch (err) {
    next(err);
  }
}

async function exportMonthly(req, res, next) {
  try {
    const { year, month } = req.query;
    const y = year ? Number(year) : new Date().getFullYear();
    const m = month ? Number(month) : new Date().getMonth() + 1;

    const workbook = await reportsService.exportMonthlyExcel(y, m);
    const fileName = `yemekhane_aylik_rapor_${y}_${String(m).padStart(2, '0')}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

async function exportYearly(req, res, next) {
  try {
    const { year } = req.query;
    const y = year ? Number(year) : new Date().getFullYear();

    const workbook = await reportsService.exportYearlyExcel(y);
    const fileName = `yemekhane_yillik_rapor_${y}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

module.exports = { daily, monthly, yearly, staffReport, exportMonthly, exportYearly };
