// ===== User & Auth =====
export interface User {
  id: number;
  username: string;
  role: "admin" | "user" | "manager" | "operator" | "auditor";
  is_active?: number;
  created_at?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ===== Department =====
export interface Department {
  id: number;
  name: string;
  created_at: string;
}

// ===== Staff =====
export interface Staff {
  id: number;
  barcode: string;
  first_name: string;
  last_name: string;
  department_id: number;
  department_name?: string;
  phone?: string | null;
  balance?: number;
  is_institutional?: number;
  photo_url: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface StaffDetail extends Staff {
  meal_rights: MealRight[];
  current_month_usage: { meal_type_id: number; used: number }[];
}

export interface CreateStaffRequest {
  barcode: string;
  first_name: string;
  last_name: string;
  department_id: number;
  phone?: string;
  is_institutional?: number;
}

export interface UpdateStaffRequest {
  barcode?: string;
  first_name?: string;
  last_name?: string;
  department_id?: number;
  phone?: string;
  is_active?: number;
  is_institutional?: number;
}

// ===== Meal Type =====
export interface MealType {
  id: number;
  name: string;
  daily_limit: number;
  is_active: number;
  created_at?: string;
}

// ===== Meal Right =====
export interface MealRight {
  id?: number;
  staff_id?: number;
  meal_type_id: number;
  meal_type_name?: string;
  monthly_quota: number;
}

// ===== Usage Log =====
export interface UsageLog {
  id: number;
  staff_id: number;
  first_name: string;
  last_name: string;
  barcode: string;
  meal_type_name: string;
  department_name: string;
  used_at: string;
  created_by?: string;
}

// ===== Scan =====
export interface ScanRequest {
  barcode: string;
  meal_type_id: number;
}

export interface ScanResponse {
  success: boolean;
  message: string;
  staff: {
    id: number;
    full_name: string;
    photo_url: string | null;
    department: string;
    is_institutional?: number;
  };
  meal_type: {
    id: number;
    name: string;
  };
  usage: {
    balance_before: number;
    balance_after: number;
    debit_amount: number;
    daily_used: number;
    daily_limit: number;
  };
}

// ===== Reports =====
export interface DailyReport {
  date: string;
  total_usage: number;
  by_meal_type: { id: number; name: string; count: number }[];
  logs: UsageLog[];
}

export interface MonthlyReport {
  year: number;
  month: number;
  total_usage: number;
  by_meal_type: { id: number; name: string; count: number }[];
  by_department: { id: number; name: string; count: number }[];
  staff_summary: {
    staff: {
      id: number;
      first_name: string;
      last_name: string;
      barcode: string;
      department: string;
    };
    total_used: number;
    total_quota: number;
    remaining: number;
  }[];
}

export interface YearlyReport {
  year: number;
  total_usage: number;
  by_month: { month: number; total: number }[];
  by_department: { id: number; name: string; count: number }[];
  by_meal_type: { id: number; name: string; count: number }[];
}

export interface StaffReport {
  staff: {
    id: number;
    first_name: string;
    last_name: string;
    barcode: string;
    department: string;
    photo_url: string | null;
  };
  usage_by_day: { date: string; meal_type_name: string; count: number }[];
  monthly_summary: { used: number; quota: number; remaining: number };
}

// ===== Settings =====
export interface Settings {
  monthly_quota?: string;
  scan_cooldown_minutes?: string;
  weekend_restriction?: string;
  session_timeout_hours?: string;
  system_name?: string;
  unified_quota?: string;
  kiosk_large_font?: string;
  kiosk_high_contrast?: string;
  auto_backup_enabled?: string;
  auto_backup_hour?: string;
  backup_retention_days?: string;
  [key: string]: string | undefined;
}

export interface BackupFileInfo {
  filename: string;
  size: number;
  mtime: string;
}

export interface AuditLog {
  id: number;
  actor_user_id: number | null;
  actor_username?: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  created_at: string;
}

// ===== API Response =====
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: { field: string; message: string }[];
}

export interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
