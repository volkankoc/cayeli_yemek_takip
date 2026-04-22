"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDepartments } from "@/lib/hooks/useDepartments";
import { createStaff } from "@/lib/api/staff";
import { uploadStaffPhoto } from "@/lib/api/staff";
import { staffSchema, type StaffFormData } from "@/lib/schemas/staff.schema";
import { Loader2, ArrowLeft, AlertCircle, RefreshCcw } from "lucide-react";
import Link from "next/link";

export default function YeniPersonelPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { 
    data: departments, 
    isLoading: isDeptsLoading, 
    isError: isDeptsError,
    refetch: refetchDepts 
  } = useDepartments();
  
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      is_institutional: 0,
    },
  });

  async function onSubmit(data: StaffFormData) {
    setIsSubmitting(true);
    try {
      const staff = await createStaff(data);
      if (photoFile) {
        await uploadStaffPhoto(staff.id, photoFile);
      }
      toast.success("Personel başarıyla oluşturuldu");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      router.push("/personel");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Personel oluşturulamadı");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLoading = isDeptsLoading;
  const isError = isDeptsError;

  return (
    <>
      <Header title="Yeni Personel" />
      <div className="p-4 lg:p-6 max-w-2xl animate-fade-in">
        <Link href="/personel">
          <Button variant="ghost" className="mb-4 group transition-all active:scale-95 text-slate-500 hover:text-indigo-600">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Geri
          </Button>
        </Link>

        {isError ? (
          <Card className="border-rose-200 bg-rose-50/30 animate-fade-in-up shadow-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <AlertCircle className="h-10 w-10 text-rose-500" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg text-slate-900">Gerekli veriler yüklenemedi</h3>
                  <p className="text-slate-500 text-sm">Departman listesi alınırken bir hata oluştu.</p>
                </div>
                <Button variant="outline" onClick={() => { refetchDepts(); }} className="active:scale-95 border-rose-200 text-rose-700 hover:bg-rose-50">
                  <RefreshCcw className="mr-2 h-4 w-4" /> Tekrar Dene
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="animate-fade-in-up shadow-lg shadow-slate-200/50 border-slate-200/60 overflow-hidden">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-lg font-bold text-slate-800">Personel Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="pt-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2 stagger-1 animate-fade-in-up">
                    <Label htmlFor="first_name" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Ad *</Label>
                    {isLoading ? <Skeleton className="h-10 w-full rounded-lg" /> : (
                      <Input 
                        id="first_name" 
                        {...register("first_name")} 
                        aria-invalid={!!errors.first_name}
                        className="transition-all focus:ring-2 focus:ring-indigo-500/20 border-slate-200 h-11"
                      />
                    )}
                    {errors.first_name && (
                      <p className="text-xs font-bold text-rose-500 animate-fade-in">{errors.first_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2 stagger-1 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
                    <Label htmlFor="last_name" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Soyad *</Label>
                    {isLoading ? <Skeleton className="h-10 w-full rounded-lg" /> : (
                      <Input 
                        id="last_name" 
                        {...register("last_name")} 
                        aria-invalid={!!errors.last_name}
                        className="transition-all focus:ring-2 focus:ring-indigo-500/20 border-slate-200 h-11"
                      />
                    )}
                    {errors.last_name && (
                      <p className="text-xs font-bold text-rose-500 animate-fade-in">{errors.last_name.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2 stagger-2 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <Label htmlFor="barcode" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Barkod No *</Label>
                    {isLoading ? <Skeleton className="h-10 w-full rounded-lg" /> : (
                      <Input 
                        id="barcode" 
                        {...register("barcode")} 
                        aria-invalid={!!errors.barcode}
                        placeholder="Örn: 123456789"
                        className="font-mono transition-all focus:ring-2 focus:ring-indigo-500/20 border-slate-200 h-11"
                      />
                    )}
                    {errors.barcode && (
                      <p className="text-xs font-bold text-rose-500 animate-fade-in">{errors.barcode.message}</p>
                    )}
                  </div>
                  <div className="space-y-2 stagger-2 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
                    <Label htmlFor="department_id" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Departman *</Label>
                    {isLoading ? <Skeleton className="h-10 w-full rounded-lg" /> : (
                      <select
                        id="department_id"
                        {...register("department_id", { valueAsNumber: true })}
                        className="w-full h-11 rounded-md border border-slate-200 bg-background px-3 text-sm transition-all hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        aria-invalid={!!errors.department_id}
                        aria-label="Departman seçimi"
                      >
                        <option value="">Seçiniz</option>
                        {departments?.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    )}
                    {errors.department_id && (
                      <p className="text-xs font-bold text-rose-500 animate-fade-in">{errors.department_id.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2 stagger-3 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Cep Telefonu *</Label>
                    {isLoading ? <Skeleton className="h-10 w-full rounded-lg" /> : (
                      <Input
                        id="phone"
                        {...register("phone")}
                        placeholder="05xxxxxxxxx"
                        className="transition-all focus:ring-2 focus:ring-indigo-500/20 border-slate-200 h-11"
                      />
                    )}
                    {errors.phone && (
                      <p className="text-xs font-bold text-rose-500 animate-fade-in">{errors.phone.message}</p>
                    )}
                  </div>
                  <div className="space-y-2 stagger-3 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
                    <Label htmlFor="photo_file" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Fotoğraf (opsiyonel)</Label>
                    <Input
                      id="photo_file"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                      className="h-11"
                    />
                    <p className="text-xs text-slate-400">Dosya adı sistemde barkod numarası ile kaydedilir.</p>
                  </div>
                </div>

                <div className="space-y-2 stagger-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                  <Label htmlFor="is_institutional" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                    Kurum Personeli
                  </Label>
                  <select
                    id="is_institutional"
                    {...register("is_institutional", { valueAsNumber: true })}
                    className="w-full h-11 rounded-md border border-slate-200 bg-background px-3 text-sm transition-all hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value={0}>Hayır (kontür ile işlem)</option>
                    <option value={1}>Evet (günde 1 yemek, kontür düşmez)</option>
                  </select>
                  <p className="text-xs text-slate-400">
                    Kurum personeli işaretlenirse bu kişi kontürden bağımsız günde 1 kez okutabilir.
                  </p>
                </div>

                <div className="flex gap-4 pt-6 stagger-5 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || isLoading} 
                    className="flex-1 h-12 text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 bg-indigo-600 hover:bg-indigo-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Oluşturuluyor...
                      </>
                    ) : "Personel Oluştur"}
                  </Button>
                  <Link href="/personel" className="flex-1">
                    <Button variant="outline" className="w-full h-12 text-sm font-bold transition-all active:scale-95 border-slate-200 hover:bg-slate-50 text-slate-600" type="button" disabled={isSubmitting}>
                      İptal
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
