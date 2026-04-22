"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getUsers, createUser, updateUser, deleteUser } from "@/lib/api/users";
import { Plus, Pencil, Trash2, Loader2, UserCog, Shield, Eye, EyeOff } from "lucide-react";
import type { User } from "@/types";

type UserRole = "admin" | "user";

export default function KullanicilarPage() {
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useQuery({ queryKey: ["users"], queryFn: getUsers });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditUser(null);
    setUsername("");
    setPassword("");
    setRole("user");
    setShowPassword(false);
    setDialogOpen(true);
  }

  function openEdit(u: User) {
    setEditUser(u);
    setUsername(u.username);
    setPassword("");
    setRole(u.role as UserRole);
    setShowPassword(false);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!username.trim()) { toast.error("Kullanıcı adı gerekli"); return; }
    if (!editUser && !password) { toast.error("Şifre gerekli"); return; }
    setSaving(true);
    try {
      if (editUser) {
        const data: Parameters<typeof updateUser>[1] = { username: username.trim(), role };
        if (password) data.password = password;
        await updateUser(editUser.id, data);
        toast.success("Kullanıcı güncellendi");
      } else {
        await createUser({ username: username.trim(), password, role });
        toast.success("Kullanıcı oluşturuldu");
      }
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDialogOpen(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: number }) =>
      updateUser(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Kullanıcı durumu güncellendi");
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Hata oluştu");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Kullanıcı silindi");
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Hata oluştu");
    },
  });

  return (
    <>
      <Header title="Kullanıcılar" />
      <div className="p-4 lg:p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Kullanıcı Listesi</CardTitle>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Ekle
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : users && users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px]">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Kullanıcı</th>
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Rol</th>
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Durum</th>
                      <th className="text-right p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${u.role === "admin" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                              {u.role === "admin" ? <Shield className="w-5 h-5" /> : <UserCog className="w-5 h-5" />}
                            </div>
                            <span className="font-medium">{u.username}</span>
                          </div>
                        </td>
                        <td className="p-3 text-sm capitalize">{u.role}</td>
                        <td className="p-3">
                          <Badge variant={u.is_active ? "default" : "secondary"}>
                            {u.is_active ? "Aktif" : "Pasif"}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            <Switch
                              checked={!!u.is_active}
                              onCheckedChange={(checked) =>
                                toggleActiveMutation.mutate({ id: u.id, is_active: checked ? 1 : 0 })
                              }
                            />
                            <Button size="icon" variant="ghost" onClick={() => openEdit(u)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger className="inline-flex size-8 items-center justify-center rounded-md text-red-500 hover:bg-muted hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Kullanıcıyı Sil</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    &quot;{u.username}&quot; kullanıcısını silmek istediğinize emin misiniz?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>İptal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(u.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Sil
                                  </AlertDialogAction>
                                </AlertDialogFooter>
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
              <p className="text-sm text-muted-foreground text-center py-8">Kullanıcı bulunamadı</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Oluştur / Düzenle Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editUser ? "Kullanıcı Düzenle" : "Yeni Kullanıcı"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Kullanıcı Adı</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="kullanici_adi"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label>{editUser ? "Yeni Şifre (boş bırakılırsa değişmez)" : "Şifre"}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editUser ? "Değiştirmek için girin" : "En az 6 karakter"}
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="user">Kullanıcı (user)</option>
                <option value="admin">Yönetici (admin)</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              İptal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
