"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useDepartments } from "@/lib/hooks/useDepartments";
import { createDepartment, updateDepartment, deleteDepartment } from "@/lib/api/departments";
import { Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";

export default function DepartmanlarPage() {
  const queryClient = useQueryClient();
  const { data: departments, isLoading } = useDepartments();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [adding, setAdding] = useState(false);

  const createMutation = useMutation({
    mutationFn: (name: string) => createDepartment(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      setNewName("");
      setAdding(false);
      toast.success("Departman oluşturuldu");
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Hata oluştu");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateDepartment(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      setEditingId(null);
      toast.success("Departman güncellendi");
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Hata oluştu");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Departman silindi");
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Hata oluştu");
    },
  });

  return (
    <>
      <Header title="Departmanlar" />
      <div className="p-4 lg:p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Departman Listesi</CardTitle>
            {!adding && (
              <Button size="sm" onClick={() => setAdding(true)}>
                <Plus className="mr-2 h-4 w-4" /> Ekle
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {adding && (
              <div className="flex gap-2 mb-4 pb-4 border-b">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Departman adı"
                  onKeyDown={(e) => e.key === "Enter" && newName.trim() && createMutation.mutate(newName.trim())}
                  autoFocus
                />
                <Button size="icon" onClick={() => newName.trim() && createMutation.mutate(newName.trim())} disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setAdding(false); setNewName(""); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : departments && departments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">ID</th>
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Departman Adı</th>
                      <th className="text-right p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((dept) => (
                      <tr key={dept.id} className="border-b">
                        <td className="p-3 text-sm text-slate-500">{dept.id}</td>
                        <td className="p-3">
                          {editingId === dept.id ? (
                            <div className="flex gap-2">
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && editName.trim() && updateMutation.mutate({ id: dept.id, name: editName.trim() })}
                                autoFocus
                              />
                              <Button size="icon" onClick={() => editName.trim() && updateMutation.mutate({ id: dept.id, name: editName.trim() })} disabled={updateMutation.isPending}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="font-medium">{dept.name}</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setEditingId(dept.id); setEditName(dept.name); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger
                                render={
                                  <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700" />
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Departmanı Sil</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    &quot;{dept.name}&quot; departmanını silmek istediğinize emin misiniz?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>İptal</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(dept.id)} className="bg-red-600 hover:bg-red-700">
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
              <p className="text-sm text-muted-foreground text-center py-8">Departman bulunamadı</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
