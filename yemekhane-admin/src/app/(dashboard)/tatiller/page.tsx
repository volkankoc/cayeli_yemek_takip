"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getHolidays, createHoliday, deleteHoliday } from "@/lib/api/holidays";
import { Plus, Trash2, CalendarDays, Loader2 } from "lucide-react";

export default function TatillerPage() {
  const queryClient = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [adding, setAdding] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: holidays, isLoading } = useQuery({
    queryKey: ["holidays", year],
    queryFn: () => getHolidays(year),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast.success("Tatil silindi");
    },
    onError: () => toast.error("Silme hatası"),
  });

  async function handleAdd() {
    if (!newDate || !newDesc.trim()) return;
    setSaving(true);
    try {
      await createHoliday({ date: newDate, description: newDesc.trim() });
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      setNewDate("");
      setNewDesc("");
      setAdding(false);
      toast.success("Tatil eklendi");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  async function addOfficialHolidays() {
    const officialHolidays = [
      { date: `${year}-01-01`, description: "Yılbaşı" },
      { date: `${year}-04-23`, description: "Ulusal Egemenlik ve Çocuk Bayramı" },
      { date: `${year}-05-01`, description: "Emek ve Dayanışma Günü" },
      { date: `${year}-05-19`, description: "Atatürk'ü Anma, Gençlik ve Spor Bayramı" },
      { date: `${year}-07-15`, description: "Demokrasi ve Millî Birlik Günü" },
      { date: `${year}-08-30`, description: "Zafer Bayramı" },
      { date: `${year}-10-29`, description: "Cumhuriyet Bayramı" },
    ];

    let added = 0;
    for (const h of officialHolidays) {
      try {
        await createHoliday(h);
        added++;
      } catch {
        // Skip duplicates
      }
    }
    queryClient.invalidateQueries({ queryKey: ["holidays"] });
    toast.success(`${added} resmi tatil eklendi`);
  }

  return (
    <>
      <Header title="Tatiller" />
      <div className="p-4 lg:p-6 space-y-4">
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Yıl</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <Button size="sm" onClick={() => setAdding(true)}><Plus className="mr-2 h-4 w-4" /> Ekle</Button>
            <Button size="sm" variant="outline" onClick={addOfficialHolidays}>Resmi Tatilleri Ekle</Button>
          </CardContent>
        </Card>

        {adding && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Tatil açıklaması" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Kaydet
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewDate(""); setNewDesc(""); }}>İptal</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-lg">{year} Tatilleri</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : holidays && holidays.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Tarih</th>
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Açıklama</th>
                      <th className="text-right p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holidays.map((h) => (
                      <tr key={h.id} className="border-b">
                        <td className="p-3 text-sm">{h.date}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-blue-500" />
                            <span className="font-medium">{h.description}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end">
                            <AlertDialog>
                              <AlertDialogTrigger
                                render={
                                  <Button size="icon" variant="ghost" className="text-red-500" />
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Tatili Sil</AlertDialogTitle><AlertDialogDescription>Bu tatili silmek istediğinize emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(h.id)} className="bg-red-600 hover:bg-red-700">Sil</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Bu yıl için tatil tanımlanmamış</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
