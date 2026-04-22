"use client";

import { useState, useEffect } from "react";
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
import { useMealTypes } from "@/lib/hooks/useMealTypes";
import { useSettings } from "@/lib/hooks/useSettings";
import { createStaff, updateStaffMealRights } from "@/lib/api/staff";
import { uploadStaffPhoto } from "@/lib/api/staff";
import { staffSchema, type StaffFormData } from "@/lib/schemas/staff.schema";
import { cn } from "@/lib/utils";
import { Loader2, ArrowLeft, AlertCircle, RefreshCcw, Utensils, Coffee, Moon, Zap } from "lucide-react";
import Link from "next/link";

const MEAL_TYPE_STYLES: Record<string, { 
  bg: string; 
  text: string; 
  border: string; 
  icon: any;
}> = {
  "Kahvaltı": { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100", icon: Coffee },
  "Öğle": { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100", icon: Utensils },
  "Akşam": { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100", icon: Moon },
  "default": { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-100", icon: Zap }
};

const getMealStyle = (name: string) => {
  if (name.includes("Kahvaltı")) return MEAL_TYPE_STYLES["Kahvaltı"];
  if (name.includes("Öğle")) return MEAL_TYPE_STYLES["Öğle"];
  if (name.includes("Akşam")) return MEAL_TYPE_STYLES["Akşam"];
  return MEAL_TYPE_STYLES["default"];
};

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
  
  const { 
    data: mealTypes, 
    isLoading: isMealTypesLoading,
    isError: isMealError,
    refetch: refetchMealTypes 
  } = useMealTypes();
  
  const { data: settings, isLoading: isSettingsLoading } = useSettings();
  const defaultQuota = parseInt(settings?.monthly_quota || "22", 10);

  const [quotas, setQuotas] = useState<Record<number, number>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
  });

  useEffect(() => {
    if (mealTypes) {
      const initialQuotas: Record<number, number> = {};
      mealTypes.filter(mt => mt.is_active).forEach(mt => {
        initialQuotas[mt.id] = defaultQuota;
      });
      setQuotas(initialQuotas);
    }
  }, [mealTypes, defaultQuota]);

  async function onSubmit(data: StaffFormData) {
    setIsSubmitting(true);
    try {
      const staff = await createStaff(data);
      if (photoFile) {
        await uploadStaffPhoto(staff.id, photoFile);
      }
      const activeMealTypes = mealTypes?.filter((mt) => mt.is_active) || [];
      const rights = activeMealTypes.map((mt) => ({
        meal_type_id: mt.id,
        monthly_quota: quotas[mt.id] ?? defaultQuota,
      }));
      if (rights.length > 0) {
        await updateStaffMealRights(staff.id, rights);
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

  const isLoading = isDeptsLoading || isMealTypesLoading || isSettingsLoading;
  const isError = isDeptsError || isMealError;

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
                  <p className="text-slate-500 text-sm">Departman veya yemek tipi listesi alınırken bir hata oluştu.</p>
                </div>
                <Button variant="outline" onClick={() => { refetchDepts(); refetchMealTypes(); }} className="active:scale-95 border-rose-200 text-rose-700 hover:bg-rose-50">
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

                {/* Meal Rights */}
                <div className="pt-8 border-t stagger-4 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-6">Yemek Hakları (Aylık Kota)</h3>
                  {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Skeleton className="h-24 w-full rounded-2xl" />
                      <Skeleton className="h-24 w-full rounded-2xl" />
                      <Skeleton className="h-24 w-full rounded-2xl" />
                    </div>
                  ) : mealTypes && mealTypes.filter((mt) => mt.is_active).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {mealTypes
                        .filter((mt) => mt.is_active)
                        .map((mt, idx) => {
                          const style = getMealStyle(mt.name);
                          const Icon = style.icon;
                          return (
                            <div 
                              key={mt.id} 
                              className={cn(
                                "p-5 border rounded-2xl transition-all hover:shadow-lg hover:-translate-y-1 group relative overflow-hidden",
                                style.bg, style.border
                              )}
                              style={{ animationDelay: `${0.3 + idx * 0.05}s` }}
                            >
                              <div className="relative z-10 space-y-3">
                                <div className="flex items-center gap-2">
                                  <div className={cn("p-1.5 rounded-lg bg-white shadow-sm", style.text)}>
                                    <Icon className="w-3.5 h-3.5" />
                                  </div>
                                  <Label htmlFor={`quota-${mt.id}`} className={cn("text-[10px] font-bold uppercase tracking-wider", style.text)}>
                                    {mt.name}
                                  </Label>
                                </div>
                                <Input
                                  id={`quota-${mt.id}`}
                                  type="number"
                                  value={quotas[mt.id] ?? defaultQuota}
                                  onChange={(e) =>
                                    setQuotas({ ...quotas, [mt.id]: parseInt(e.target.value) || 0 })
                                  }
                                  min={0}
                                  className={cn("bg-transparent border-none p-0 h-8 text-2xl font-black focus-visible:ring-0 focus-visible:ring-offset-0", style.text)}
                                />
                              </div>
                              {/* Decorative background icon */}
                              <Icon className={cn("absolute -right-4 -bottom-4 w-20 h-20 opacity-[0.03] rotate-12", style.text)} />
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-slate-400 bg-slate-50 p-8 rounded-2xl border border-dashed border-slate-200 text-center animate-fade-in">
                      Aktif yemek tipi bulunamadı.
                    </div>
                  )}
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
