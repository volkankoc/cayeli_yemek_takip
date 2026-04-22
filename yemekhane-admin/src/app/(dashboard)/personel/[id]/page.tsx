"use client";

import { useState, useEffect, use } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { getStaffById, updateStaff } from "@/lib/api/staff";
import { uploadStaffPhoto } from "@/lib/api/staff";
import { getStaffReport } from "@/lib/api/reports";
import { useDepartments } from "@/lib/hooks/useDepartments";
import { updateStaffSchema, type UpdateStaffFormData } from "@/lib/schemas/staff.schema";
import { resolveApiAssetUrl } from "@/lib/utils";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PersonelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const staffId = Number(id);
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const { data: staff, isLoading } = useQuery({
    queryKey: ["staff", staffId],
    queryFn: () => getStaffById(staffId),
    enabled: !!staffId,
  });

  const { data: departments } = useDepartments();

  const now = new Date();
  const { data: staffReport } = useQuery({
    queryKey: ["reports", "staff", staffId, now.getFullYear(), now.getMonth() + 1],
    queryFn: () => getStaffReport(staffId, now.getFullYear(), now.getMonth() + 1),
    enabled: !!staffId,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateStaffFormData>({
    resolver: zodResolver(updateStaffSchema),
  });

  useEffect(() => {
    if (staff) {
      reset({
        barcode: staff.barcode,
        first_name: staff.first_name,
        last_name: staff.last_name,
        department_id: staff.department_id,
        phone: staff.phone || "",
        is_active: staff.is_active,
        is_institutional: staff.is_institutional ?? 0,
      });
    }
  }, [staff, reset]);

  async function onSubmit(data: UpdateStaffFormData) {
    setLoading(true);
    try {
      await updateStaff(staffId, data);
      if (photoFile) {
        await uploadStaffPhoto(staffId, photoFile);
      }
      queryClient.invalidateQueries({ queryKey: ["staff", staffId] });
      toast.success("Personel bilgileri güncellendi");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Güncelleme başarısız");
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) {
    return (
      <>
        <Header title="Personel Detay" />
        <div className="p-4 lg:p-6 w-full space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </>
    );
  }

  if (!staff) {
    return (
      <>
        <Header title="Personel Detay" />
        <div className="p-4 lg:p-6 w-full">
          <p className="text-muted-foreground">Personel bulunamadı</p>
        </div>
      </>
    );
  }

  const photoSrc = resolveApiAssetUrl(staff.photo_url);

  return (
    <>
      <Header title={`${staff.first_name} ${staff.last_name}`} />
      <div className="p-4 lg:p-6 w-full">
        <Link href="/personel">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Geri
          </Button>
        </Link>

        <Tabs defaultValue="bilgiler">
          <TabsList className="mb-4 w-full sm:w-auto flex flex-wrap h-auto gap-1">
            <TabsTrigger value="bilgiler">Bilgiler</TabsTrigger>
            <TabsTrigger value="haklar">Kontür Durumu</TabsTrigger>
            <TabsTrigger value="gecmis">Kullanım Geçmişi</TabsTrigger>
          </TabsList>

          {/* Tab 1: Info */}
          <TabsContent value="bilgiler">
            <Card>
              <CardHeader>
                <CardTitle>Personel Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[minmax(0,1fr)_280px] gap-8 lg:gap-10 items-start">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 min-w-0 order-2 lg:order-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ad</Label>
                      <Input {...register("first_name")} />
                      {errors.first_name && <p className="text-sm text-red-500">{errors.first_name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Soyad</Label>
                      <Input {...register("last_name")} />
                      {errors.last_name && <p className="text-sm text-red-500">{errors.last_name.message}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Barkod No</Label>
                      <Input {...register("barcode")} className="font-mono" />
                      {errors.barcode && <p className="text-sm text-red-500">{errors.barcode.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Departman</Label>
                      <select {...register("department_id", { valueAsNumber: true })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                        {departments?.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cep Telefonu</Label>
                      <Input {...register("phone")} placeholder="05xxxxxxxxx" />
                      {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Fotoğraf Yükle</Label>
                      <Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
                      {photoSrc ? (
                        <p className="text-xs text-muted-foreground">
                          Yeni dosya seçerseniz kayıtta güncellenir.
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Henüz fotoğraf yok; JPG veya PNG yükleyebilirsiniz.</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Kurum Personeli</Label>
                    <select
                      {...register("is_institutional", { valueAsNumber: true })}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value={0}>Hayır (kontür ile işlem)</option>
                      <option value={1}>Evet (günde 1 yemek, kontür düşmez)</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Kurum personeli kullanıcılar kontürden bağımsız günde yalnızca 1 kez okutabilir.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label>Aktif</Label>
                    <Switch
                      checked={staff.is_active === 1}
                      onCheckedChange={async (checked) => {
                        await updateStaff(staffId, { is_active: checked ? 1 : 0 });
                        queryClient.invalidateQueries({ queryKey: ["staff", staffId] });
                        toast.success(checked ? "Personel aktifleştirildi" : "Personel pasifleştirildi");
                      }}
                    />
                    <Badge variant={staff.is_active ? "default" : "secondary"}>
                      {staff.is_active ? "Aktif" : "Pasif"}
                    </Badge>
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Kaydet
                  </Button>
                </form>

                <aside className="flex flex-col items-center lg:items-stretch gap-4 order-1 lg:order-2 lg:sticky lg:top-20 self-start w-full max-w-[280px] mx-auto lg:max-w-none lg:mx-0">
                  <div className="text-center lg:text-left w-full space-y-1.5">
                    <p className="font-semibold text-lg lg:text-xl text-slate-900 tracking-tight">
                      {staff.first_name} {staff.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{staff.department_name || "—"}</p>
                    <Badge variant={staff.is_active ? "default" : "secondary"} className="mt-0.5 lg:mt-1">
                      {staff.is_active ? "Aktif" : "Pasif"}
                    </Badge>
                  </div>

                  {photoSrc ? (
                    <div className="relative w-40 h-40 sm:w-44 sm:h-44 xl:w-52 xl:h-52 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-md ring-1 ring-black/[0.04] shrink-0 mx-auto lg:mx-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoSrc}
                        alt={`${staff.first_name} ${staff.last_name}`}
                        className="h-full w-full object-cover object-center"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-40 h-40 sm:w-44 sm:h-44 xl:w-52 xl:h-52 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-muted-foreground shrink-0 mx-auto lg:mx-0"
                      aria-hidden
                    >
                      <span className="text-3xl font-bold tracking-tight text-slate-400">
                        {staff.first_name.charAt(0)}
                        {staff.last_name.charAt(0)}
                      </span>
                      <span className="text-[11px] mt-1.5 px-2 text-center leading-tight">Fotoğraf yok</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground text-center lg:text-left hidden lg:block pb-1">
                    Profil fotoğrafı — yeni görseli soldaki formdan yükleyebilirsiniz.
                  </p>
                </aside>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Credit Balance */}
          <TabsContent value="haklar">
            <Card>
              <CardHeader>
                <CardTitle>Kontür Durumu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-5">
                  <p className="text-sm text-indigo-700 font-medium">Toplam Kalan Hak</p>
                  <p className="text-4xl font-bold text-indigo-900 mt-2 tabular-nums">
                    {Number(staff.balance || 0).toFixed(2)} kontür
                  </p>
                  <p className="text-xs text-indigo-700/80 mt-2">
                    Sistem kuralı: <strong>1 kontür = 1 yemek hakkı</strong>. Her okutma işleminde 1 kontür düşer.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Usage History */}
          <TabsContent value="gecmis">
            <Card>
              <CardHeader>
                <CardTitle>Kullanım Geçmişi (Bu Ay)</CardTitle>
              </CardHeader>
              <CardContent>
                {staffReport?.usage_by_day && staffReport.usage_by_day.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Tarih</th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Yemek Tipi</th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Kullanım</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffReport.usage_by_day.map((u, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-3 text-sm">{u.date}</td>
                          <td className="p-3 text-sm">{u.meal_type_name}</td>
                          <td className="p-3 text-sm">{u.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Bu ay kullanım kaydı bulunamadı
                  </p>
                )}
                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium">
                    Aylık Özet: {staffReport?.monthly_summary?.used || 0} / {staffReport?.monthly_summary?.quota || 0} kullanım
                    ({staffReport?.monthly_summary?.remaining || 0} kalan)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
