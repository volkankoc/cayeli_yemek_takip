"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAuditLogs } from "@/lib/api/logs";
import type { AuditLog } from "@/types";

function buildHumanMessage(log: AuditLog) {
  const actor = log.actor_username || "Sistem";
  let details: Record<string, unknown> | null = null;
  try {
    details = log.details ? JSON.parse(log.details) : null;
  } catch {
    details = null;
  }

  const d = details && typeof details === "object" ? (details as Record<string, unknown>) : null;
  const after = d?.after && typeof d.after === "object" ? (d.after as Record<string, unknown>) : null;
  const staffFromDetails = d?.staff && typeof d.staff === "object" ? (d.staff as Record<string, unknown>) : null;
  const detailName = d
    ? `${String(d.first_name || after?.first_name || staffFromDetails?.first_name || "")} ${String(d.last_name || after?.last_name || staffFromDetails?.last_name || "")}`.trim()
    : "";

  if (log.action === "staff.meal_rights.update") {
    return `${actor}, ${detailName || `personel #${log.entity_id}`} için yemek haklarını güncelledi.`;
  }
  if (log.action === "staff.deactivate") {
    return `${actor}, ${detailName || `personel #${log.entity_id}`} kaydını pasife aldı.`;
  }
  if (log.action === "staff.create") {
    const firstName = String(details?.first_name || "");
    const lastName = String(details?.last_name || "");
    return `${actor}, ${firstName} ${lastName} adlı personeli ekledi.`;
  }
  if (log.action === "staff.create.bulk") {
    const firstName = String(details?.first_name || "");
    const lastName = String(details?.last_name || "");
    return `${actor}, toplu aktarma ile ${firstName} ${lastName} personelini ekledi.`;
  }
  if (log.action === "staff.update") {
    return `${actor}, ${detailName || `personel #${log.entity_id}`} kaydını düzenledi.`;
  }
  if (log.action === "settings.update") {
    return `${actor}, sistem ayarlarını güncelledi.`;
  }
  if (log.action === "backup.created") {
    const src = String(details?.source || "");
    const fn = String(details?.filename || log.entity_id || "");
    return `${actor}, veritabanı yedeği oluşturdu${fn ? ` (${fn})` : ""}${src ? ` [${src}]` : ""}.`;
  }
  if (log.action === "backup.restore_pending") {
    return `${actor}, veritabanı geri yükleme dosyası yükledi; uygulama için API yeniden başlatılmalı.`;
  }
  if (log.action === "permissions.update") {
    return `${actor}, rol izinlerini güncelledi.`;
  }
  return `${actor}, ${log.action} işlemini yaptı.`;
}

export default function LoglarPage() {
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", action, entityType],
    queryFn: () => getAuditLogs({ page: 1, limit: 100, action: action || undefined, entity_type: entityType || undefined }),
  });

  return (
    <>
      <Header title="İşlem Logları" />
      <div className="p-4 lg:p-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Filtreler</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input placeholder="Aksiyon ara (örn: staff.)" value={action} onChange={(e) => setAction(e.target.value)} />
            <Input placeholder="Entity type (örn: staff)" value={entityType} onChange={(e) => setEntityType(e.target.value)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Son Kayıtlar (Okunabilir)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {isLoading ? (
                <p className="text-sm text-muted-foreground p-3">Yükleniyor...</p>
              ) : data?.data?.length ? (
                <table className="w-full min-w-[780px]">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Zaman</th>
                      <th className="text-left p-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Kullanıcı</th>
                      <th className="text-left p-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Mesaj</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((log) => (
                      <tr key={log.id} className="border-b align-top">
                        <td className="p-2 text-xs whitespace-nowrap text-slate-600">
                          {new Date(log.created_at).toLocaleString("tr-TR")}
                        </td>
                        <td className="p-2 text-xs text-slate-700">{log.actor_username || "Sistem"}</td>
                        <td className="p-2 text-xs text-slate-800">{buildHumanMessage(log)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-muted-foreground p-3">Kayıt bulunamadı.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
