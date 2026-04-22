import apiClient from "./client";
import type { ApiResponse, BackupFileInfo } from "@/types";

export async function listBackups(): Promise<BackupFileInfo[]> {
  const res = await apiClient.get<ApiResponse<BackupFileInfo[]>>("/backups");
  return res.data.data;
}

export async function runBackupNow(): Promise<{ filename: string; size: number }> {
  const res = await apiClient.post<ApiResponse<{ filename: string; size: number }>>("/backups/run");
  return res.data.data;
}

export async function downloadBackupFile(filename: string): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
  const res = await fetch(`${base}/backups/download/${encodeURIComponent(filename)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error || "İndirme başarısız");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function restoreBackup(file: File): Promise<{ restartRequired: boolean }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await apiClient.post<ApiResponse<{ restartRequired: boolean }>>("/backups/restore", fd);
  return res.data.data;
}
