const { z } = require('zod');

const boolString = z.union([z.boolean(), z.string()]).transform((v) => {
  if (typeof v === 'boolean') return String(v);
  return String(v).toLowerCase() === 'true' ? 'true' : 'false';
});

const intString = (min, max) => z.coerce.number().int().min(min).max(max).transform(String);

const settingsUpdateSchema = z.object({
  monthly_quota: intString(1, 60).optional(),
  scan_cooldown_minutes: intString(0, 180).optional(),
  weekend_restriction: boolString.optional(),
  session_timeout_hours: intString(1, 72).optional(),
  system_name: z.string().trim().min(3).max(120).optional(),
  unified_quota: boolString.optional(),
  allowed_barcode_formats: z.string().trim().min(3).max(200).optional(),
  offline_queue_enabled: boolString.optional(),
  offline_queue_max_size: intString(100, 50000).optional(),
  sync_retry_interval_seconds: intString(5, 600).optional(),
  scanner_input_mode: z.enum(['camera', 'keyboard', 'serial', 'network']).optional(),
  scanner_network_endpoint: z.string().max(250).optional(),
  scanner_serial_port: z.string().max(120).optional(),
  scanner_heartbeat_seconds: intString(5, 300).optional(),
  password_min_length: intString(8, 128).optional(),
  login_max_attempts: intString(3, 30).optional(),
  login_window_minutes: intString(1, 120).optional(),
  report_default_range_days: intString(1, 365).optional(),
  data_retention_days: intString(30, 3650).optional(),
  alert_email: z.string().email().or(z.literal('')).optional(),
  enable_metrics: boolString.optional(),
  kiosk_large_font: boolString.optional(),
  kiosk_high_contrast: boolString.optional(),
  auto_backup_enabled: boolString.optional(),
  auto_backup_hour: intString(0, 23).optional(),
  backup_retention_days: intString(1, 365).optional(),
}).strict();

module.exports = { settingsUpdateSchema };
