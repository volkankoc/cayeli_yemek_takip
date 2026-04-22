"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useMealTypes } from "@/lib/hooks/useMealTypes";
import { createMealType, updateMealType } from "@/lib/api/meal-types";
import { Plus, Pencil, Loader2 } from "lucide-react";

export default function YemekTipleriPage() {
  const queryClient = useQueryClient();
  const { data: mealTypes, isLoading } = useMealTypes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [dailyLimit, setDailyLimit] = useState(1);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditId(null);
    setName("");
    setDailyLimit(1);
    setDialogOpen(true);
  }

  function openEdit(mt: { id: number; name: string; daily_limit: number }) {
    setEditId(mt.id);
    setName(mt.name);
    setDailyLimit(mt.daily_limit);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await updateMealType(editId, { name: name.trim(), daily_limit: dailyLimit });
        toast.success("Yemek tipi güncellendi");
      } else {
        await createMealType({ name: name.trim(), daily_limit: dailyLimit });
        toast.success("Yemek tipi oluşturuldu");
      }
      queryClient.invalidateQueries({ queryKey: ["mealTypes"] });
      setDialogOpen(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: number, currentActive: number) {
    try {
      await updateMealType(id, { is_active: currentActive ? 0 : 1 });
      queryClient.invalidateQueries({ queryKey: ["mealTypes"] });
      toast.success(currentActive ? "Yemek tipi pasifleştirildi" : "Yemek tipi aktifleştirildi");
    } catch {
      toast.error("Hata oluştu");
    }
  }

  return (
    <>
      <Header title="Yemek Tipleri" />
      <div className="p-4 lg:p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Yemek Tipleri</CardTitle>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Ekle
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : mealTypes && mealTypes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">ID</th>
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Yemek Tipi</th>
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Günlük Limit</th>
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Durum</th>
                      <th className="text-right p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mealTypes.map((mt) => (
                      <tr key={mt.id} className="border-b">
                        <td className="p-3 text-sm text-slate-500">{mt.id}</td>
                        <td className="p-3 font-medium">{mt.name}</td>
                        <td className="p-3 text-sm">{mt.daily_limit}</td>
                        <td className="p-3">
                          <Badge variant={mt.is_active ? "default" : "secondary"}>
                            {mt.is_active ? "Aktif" : "Pasif"}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end items-center gap-3">
                            <Switch
                              checked={!!mt.is_active}
                              onCheckedChange={() => toggleActive(mt.id, mt.is_active)}
                            />
                            <Button size="icon" variant="ghost" onClick={() => openEdit(mt)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Yemek tipi bulunamadı</p>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Yemek Tipi Düzenle" : "Yeni Yemek Tipi"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Ad</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Günlük Limit</Label>
                <Input type="number" value={dailyLimit} onChange={(e) => setDailyLimit(parseInt(e.target.value) || 1)} min={1} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={saving || !name.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
