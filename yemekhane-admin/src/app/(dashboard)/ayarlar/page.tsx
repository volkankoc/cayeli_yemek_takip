"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSettings } from "@/lib/hooks/useSettings";
import { updateSettings } from "@/lib/api/settings";
import { downloadBackupFile, listBackups, restoreBackup, runBackupNow } from "@/lib/api/backups";
import { Database, Download, Loader2, Settings2, Upload } from "lucide-react";

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AyarlarPage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const { data: settings, isLoading: settingsLoading } = useSettings();

  const { data: backups, isLoading: backupsLoading } = useQuery({
    queryKey: ["backups"],
    queryFn: listBackups,
  });

  const saveMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Ayarlar kaydedildi");
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string; details?: { message: string }[] } } };
      const msg =
        err.response?.data?.details?.[0]?.message || err.response?.data?.error || "Kayıt başarısız";
      toast.error(msg);
    },
  });

  const backupRunMutation = useMutation({
    mutationFn: runBackupNow,
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      toast.success(`Yedek oluşturuldu: ${d.filename}`);
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Yedekleme hatası");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: restoreBackup,
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      setRestoreOpen(false);
      setPendingFile(null);
      if (d.restartRequired) {
        toast.success("Geri yükleme kuyruğa alındı. API sürecini yeniden başlatın.", { duration: 8000 });
      }
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Geri yükleme başarısız");
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      system_name: String(fd.get("system_name") || "").trim(),
      monthly_quota: String(fd.get("monthly_quota") || ""),
      scan_cooldown_minutes: String(fd.get("scan_cooldown_minutes") || ""),
      kiosk_large_font: fd.get("kiosk_large_font") === "on" ? "true" : "false",
      kiosk_high_contrast: fd.get("kiosk_high_contrast") === "on" ? "true" : "false",
      auto_backup_enabled: fd.get("auto_backup_enabled") === "on" ? "true" : "false",
      auto_backup_hour: String(fd.get("auto_backup_hour") || "3"),
      backup_retention_days: String(fd.get("backup_retention_days") || "14"),
    };
    saveMutation.mutate(payload);
  }

  async function handleDownload(name: string) {
    try {
      await downloadBackupFile(name);
      toast.success("İndirme başladı");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İndirme hatası");
    }
  }

  function onPickRestoreFile() {
    const f = fileRef.current?.files?.[0];
    if (!f) return;
    setPendingFile(f);
    setRestoreOpen(true);
    fileRef.current!.value = "";
  }

  function confirmRestore() {
    if (pendingFile) restoreMutation.mutate(pendingFile);
  }

  if (settingsLoading || !settings) {
    return (
      <>
        <Header title="Ayarlar" />
        <div className="p-4 lg:p-6 space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Ayarlar" />
      <div className="p-4 lg:p-6 space-y-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Genel
              </CardTitle>
              <CardDescription>Sistem adı ve temel kota varsayılanları.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="system_name">Sistem adı</Label>
                <Input
                  id="system_name"
                  name="system_name"
                  defaultValue={settings.system_name || ""}
                  minLength={3}
                  maxLength={120}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly_quota">Varsayılan aylık kota</Label>
                  <Input
                    id="monthly_quota"
                    name="monthly_quota"
                    type="number"
                    min={1}
                    max={60}
                    defaultValue={settings.monthly_quota || "22"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scan_cooldown_minutes">Tarama bekleme (dk)</Label>
                  <Input
                    id="scan_cooldown_minutes"
                    name="scan_cooldown_minutes"
                    type="number"
                    min={0}
                    max={180}
                    defaultValue={settings.scan_cooldown_minutes || "0"}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tarama ekranı (kiosk)</CardTitle>
              <CardDescription>
                Bu seçenekler yalnızca tarama web arayüzünü etkiler; ayarlar API üzerinden okunur.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="kiosk_large_font"
                  defaultChecked={settings.kiosk_large_font === "true"}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm">Büyük yazı tipi</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="kiosk_high_contrast"
                  defaultChecked={settings.kiosk_high_contrast === "true"}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm">Yüksek kontrast</span>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Veritabanı yedekleri
              </CardTitle>
              <CardDescription>
                Günlük otomatik yedek sunucunun yerel saatinde çalışır. Geri yükleme dosyası yüklendikten sonra API
                sürecini mutlaka yeniden başlatın.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="auto_backup_enabled"
                  defaultChecked={settings.auto_backup_enabled !== "false"}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm">Otomatik günlük yedek</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="auto_backup_hour">Yedek saati (0–23)</Label>
                  <Input
                    id="auto_backup_hour"
                    name="auto_backup_hour"
                    type="number"
                    min={0}
                    max={23}
                    defaultValue={settings.auto_backup_hour || "3"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backup_retention_days">Saklama (gün)</Label>
                  <Input
                    id="backup_retention_days"
                    name="backup_retention_days"
                    type="number"
                    min={1}
                    max={365}
                    defaultValue={settings.backup_retention_days || "14"}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={backupRunMutation.isPending}
                  onClick={() => backupRunMutation.mutate()}
                >
                  {backupRunMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Şimdi yedek al
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Geri yükle (SQLite)
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".sqlite,application/x-sqlite3,application/octet-stream"
                  className="hidden"
                  aria-hidden
                  onChange={onPickRestoreFile}
                />
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                  Yedek dosyaları
                </div>
                {backupsLoading ? (
                  <div className="p-4">
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : !backups?.length ? (
                  <p className="p-4 text-sm text-muted-foreground">Henüz yedek yok.</p>
                ) : (
                  <ul className="divide-y max-h-64 overflow-y-auto">
                    {backups.map((b) => (
                      <li key={b.filename} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{b.filename}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatBytes(b.size)} · {new Date(b.mtime).toLocaleString("tr-TR")}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="shrink-0"
                          onClick={() => handleDownload(b.filename)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Tüm ayarları kaydet
          </Button>
        </form>
      </div>

      <AlertDialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Veritabanını geri yükle?</AlertDialogTitle>
            <AlertDialogDescription>
              Mevcut veritabanı yedeklenir; seçilen dosya bir sonraki API başlangıcında uygulanır. Süreç yeniden
              başlatılmadan değişiklik olmaz. Emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPendingFile(null);
              }}
            >
              Vazgeç
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(ev) => {
                ev.preventDefault();
                confirmRestore();
              }}
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Evet, yükle"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
