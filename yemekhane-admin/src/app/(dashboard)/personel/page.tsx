"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useStaffList } from "@/lib/hooks/useStaff";
import { useDepartments } from "@/lib/hooks/useDepartments";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { bulkImportStaff, deleteStaff, resetStaffMealRights, updateStaff } from "@/lib/api/staff";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Ellipsis,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCcw,
  UserX,
  FileDown,
} from "lucide-react";

// Avatar colors for variety and personality
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-600 border-blue-200",
  "bg-emerald-100 text-emerald-600 border-emerald-200",
  "bg-indigo-100 text-indigo-600 border-indigo-200",
  "bg-violet-100 text-violet-600 border-violet-200",
  "bg-amber-100 text-amber-600 border-amber-200",
  "bg-rose-100 text-rose-600 border-rose-200",
  "bg-cyan-100 text-cyan-600 border-cyan-200",
];

const getAvatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

/** İlk sayfa = yalnızca veri (handleExcelUpload ilk sayfayı okur). */
function downloadStaffImportTemplate(sampleDepartmentName: string) {
  const dataSheet = XLSX.utils.aoa_to_sheet([
    ["barcode", "first_name", "last_name", "phone", "department"],
    ["9876543210128", "Ahmet", "Yılmaz", "05551112233", sampleDepartmentName],
  ]);
  const helpRows = [
    ["Personel toplu yükleme — sütunlar (birinci sayfa: Personel)"],
    [],
    ["Sütun adı (tercih)", "Zorunlu", "Açıklama"],
    ["barcode veya barkod", "Evet", "Personel barkodu (ör. EAN-13)."],
    ["first_name veya ad", "Evet", "Ad"],
    ["last_name veya soyad", "Evet", "Soyad"],
    ["phone, cep veya telefon", "Hayır", "Cep telefonu; boş bırakılabilir."],
    ["department veya departman", "Evet*", "Sistemdeki departman adı ile birebir (büyük/küçük harf duyarsız)."],
    ["department_id", "Evet*", "Sayısal departman kimliği; department sütunu yerine kullanılabilir."],
    [],
    ["* department veya department_id sütunlarından biri yeterlidir; ikisi de doluysa department_id önceliklidir."],
    [],
    ["Örnek satırdaki veriler yalnızca formattır; yüklemeden önce silin veya kendi personelinizle değiştirin."],
  ];
  const helpSheet = XLSX.utils.aoa_to_sheet(helpRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, dataSheet, "Personel");
  XLSX.utils.book_append_sheet(wb, helpSheet, "Talimatlar");
  XLSX.writeFile(wb, "personel_toplu_yukleme_sablonu.xlsx");
}

export default function PersonelPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [isActive, setIsActive] = useState<string>("");
  const [page, setPage] = useState(1);
  const [openActionFor, setOpenActionFor] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const actionButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const limit = 25;

  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading, isError, refetch } = useStaffList({
    search: debouncedSearch || undefined,
    department_id: departmentId ? Number(departmentId) : undefined,
    is_active: isActive || undefined,
    page,
    limit,
  });

  const { data: departments } = useDepartments();
  const departmentsByName = Object.fromEntries((departments || []).map((d) => [d.name.trim().toLowerCase(), d.id]));
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: number }) => updateStaff(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Personel durumu güncellendi");
    },
    onError: () => toast.error("Durum güncelleme başarısız"),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Personel silindi (pasife alındı)");
    },
    onError: () => toast.error("Silme işlemi başarısız"),
  });
  const resetRightsMutation = useMutation({
    mutationFn: (id: number) => resetStaffMealRights(id),
    onSuccess: () => toast.success("Yemek hakları sıfırlandı"),
    onError: () => toast.error("Yemek hakları sıfırlanamadı"),
  });
  const bulkImportMutation = useMutation({
    mutationFn: (rows: Array<{ barcode: string; first_name: string; last_name: string; department_id: number; phone?: string }>) => bulkImportStaff(rows),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success(`Toplu yükleme tamamlandı: ${res.created} eklendi, ${res.skipped} atlandı`);
    },
    onError: () => toast.error("Toplu yükleme başarısız"),
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const clearFilters = () => {
    setSearch("");
    setDepartmentId("");
    setIsActive("");
    setPage(1);
  };

  useEffect(() => {
    if (openActionFor === null) return;
    const onDocMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const inMenu = !!target?.closest("[data-action-menu-root='true']");
      const inButton = !!target?.closest("[data-action-trigger='true']");
      if (!inMenu && !inButton) {
        setOpenActionFor(null);
        setMenuPosition(null);
      }
    };
    const onResize = () => {
      setOpenActionFor(null);
      setMenuPosition(null);
    };
    const onScroll = () => {
      setOpenActionFor(null);
      setMenuPosition(null);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [openActionFor]);

  function toggleActionMenu(staffId: number) {
    if (openActionFor === staffId) {
      setOpenActionFor(null);
      setMenuPosition(null);
      return;
    }
    const trigger = actionButtonRefs.current[staffId];
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 208;
    const menuHeight = 146;
    const left = Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8);
    const placeAbove = rect.bottom + menuHeight > window.innerHeight - 8;
    const top = placeAbove ? Math.max(8, rect.top - menuHeight - 6) : rect.bottom + 6;
    setMenuPosition({ top, left: Math.max(8, left) });
    setOpenActionFor(staffId);
  }

  async function handleExcelUpload(file: File) {
    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const payload = rows
      .map((r) => {
        const departmentName = String(r.department || r.departman || "").trim().toLowerCase();
        return {
          barcode: String(r.barcode || r.barkod || "").trim(),
          first_name: String(r.first_name || r.ad || "").trim(),
          last_name: String(r.last_name || r.soyad || "").trim(),
          phone: String(r.phone || r.cep || r.telefon || "").trim(),
          department_id: Number(r.department_id) || departmentsByName[departmentName],
        };
      })
      .filter((r) => r.barcode && r.first_name && r.last_name && r.department_id);
    if (!payload.length) {
      toast.error("Excel içinde geçerli kayıt bulunamadı.");
      return;
    }
    bulkImportMutation.mutate(payload);
  }

  return (
    <>
      <Header title="Personel Yönetimi" />
      <div className="p-4 lg:p-6 space-y-4 animate-fade-in">
        {/* Filters */}
        <Card className="stagger-1 animate-fade-in-up border-slate-200/60 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Ad, soyad veya barkod ara..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="pl-9 transition-all focus:ring-2 focus:ring-indigo-500/20 border-slate-200"
                    aria-label="Personel ara"
                  />
                </div>
              </div>
              <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full sm:w-auto">
                <select
                  value={departmentId}
                  onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}
                  className="flex-1 sm:flex-none h-10 rounded-md border border-slate-200 bg-background px-3 text-sm min-w-[140px] transition-all hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  aria-label="Departman filtresi"
                >
                  <option value="">Tüm Departmanlar</option>
                  {departments?.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <select
                  value={isActive}
                  onChange={(e) => { setIsActive(e.target.value); setPage(1); }}
                  className="flex-1 sm:flex-none h-10 rounded-md border border-slate-200 bg-background px-3 text-sm min-w-[120px] transition-all hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  aria-label="Durum filtresi"
                >
                  <option value="">Tüm Durum</option>
                  <option value="1">Aktif</option>
                  <option value="0">Pasif</option>
                </select>
                <Link href="/personel/yeni" className="w-full sm:w-auto">
                  <Button className="w-full shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all active:scale-95 bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="mr-2 h-4 w-4" /> Yeni Personel
                  </Button>
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    const sampleDept =
                      departments?.[0]?.name?.trim() || "Örnek Departman (sistemdeki adla değiştirin)";
                    downloadStaffImportTemplate(sampleDept);
                    toast.success("Şablon indirildi. Örnek satırı düzenleyin veya silin.");
                  }}
                >
                  <FileDown className="mr-2 h-4 w-4 shrink-0" />
                  Örnek format indir
                </Button>
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => fileInputRef.current?.click()}>
                  Excel ile Toplu Yükle
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleExcelUpload(file);
                    e.currentTarget.value = "";
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stagger-2 animate-fade-in-up border-slate-200/60 shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border m-3 p-4">
                  <Skeleton className="h-5 w-40 mb-2" />
                  <Skeleton className="h-4 w-28 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))
            ) : isError ? (
              <div className="p-12 text-center">
                <div className="flex flex-col items-center justify-center gap-3 animate-fade-in">
                  <AlertCircle className="h-10 w-10 text-rose-500" />
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg text-slate-900">Veri yüklenemedi</h3>
                    <p className="text-slate-500 text-sm">Personel listesi alınırken bir hata oluştu.</p>
                  </div>
                  <Button variant="outline" onClick={() => refetch()} className="mt-2 active:scale-95 border-slate-200 hover:bg-slate-50">
                    <RefreshCcw className="mr-2 h-4 w-4" /> Tekrar Dene
                  </Button>
                </div>
              </div>
            ) : data?.data && data.data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Ad Soyad</th>
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Departman</th>
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Barkod</th>
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Durum</th>
                      <th className="text-right p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((staff) => (
                      <tr key={staff.id} className="border-b">
                        <td className="p-3">
                          <Link href={`/personel/${staff.id}`} className="flex items-center gap-3 min-w-0">
                            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm border", getAvatarColor(staff.id))}>
                              {staff.first_name.charAt(0)}{staff.last_name.charAt(0)}
                            </div>
                            <span className="font-medium text-slate-800 truncate">{staff.first_name} {staff.last_name}</span>
                          </Link>
                        </td>
                        <td className="p-3 text-sm text-slate-600">{staff.department_name || "-"}</td>
                        <td className="p-3 text-sm font-mono text-slate-600">{staff.barcode}</td>
                        <td className="p-3">
                          <Badge variant={staff.is_active ? "default" : "secondary"}>
                            {staff.is_active ? "Aktif" : "Pasif"}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              data-action-trigger="true"
                              ref={(el) => {
                                actionButtonRefs.current[staff.id] = el;
                              }}
                              onClick={() => toggleActionMenu(staff.id)}
                            >
                              <Ellipsis className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="flex flex-col items-center justify-center gap-3 text-slate-400 animate-fade-in">
                  <UserX className="h-10 w-10 opacity-20" />
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">Personel bulunamadı</p>
                    <p className="text-sm">Filtreleri değiştirerek tekrar deneyebilirsiniz.</p>
                  </div>
                  {(search || departmentId || isActive) && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2 active:scale-95 text-indigo-600 hover:bg-indigo-50">
                      Filtreleri Temizle
                    </Button>
                  )}
                </div>
              </div>
            )}

            {openActionFor !== null && menuPosition && typeof document !== "undefined" && (() => {
              const selected = data?.data.find((s) => s.id === openActionFor);
              if (!selected) return null;
              return createPortal(
                <div
                  ref={actionMenuRef}
                  data-action-menu-root="true"
                  className="fixed z-[9999] w-52 rounded-md border bg-white shadow-xl p-1"
                  style={{ top: menuPosition.top, left: menuPosition.left }}
                >
                  <Link href={`/personel/${selected.id}`} className="block w-full text-left px-2 py-1.5 text-sm rounded hover:bg-slate-50">
                    Düzenle
                  </Link>
                  <button
                    type="button"
                    className="block w-full text-left px-2 py-1.5 text-sm rounded hover:bg-slate-50"
                    onClick={() => updateStatusMutation.mutate({ id: selected.id, is_active: selected.is_active ? 0 : 1 })}
                  >
                    {selected.is_active ? "Pasif Yap" : "Aktif Yap"}
                  </button>
                  <button
                    type="button"
                    className="block w-full text-left px-2 py-1.5 text-sm rounded hover:bg-slate-50"
                    onClick={() => resetRightsMutation.mutate(selected.id)}
                  >
                    Yemek Hakkı Sıfırla
                  </button>
                  <button
                    type="button"
                    className="block w-full text-left px-2 py-1.5 text-sm rounded text-red-600 hover:bg-red-50"
                    onClick={() => deleteMutation.mutate(selected.id)}
                  >
                    Sil (Pasife Al)
                  </button>
                </div>,
                document.body
              );
            })()}

            {/* Pagination */}
            {!isLoading && !isError && totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t bg-slate-50/30">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Toplam {data?.total} kayıt
                </p>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={page <= 1} 
                    onClick={() => { setPage(page - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="h-8 w-8 p-0 transition-transform active:scale-90 border-slate-200"
                    aria-label="Önceki sayfa"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="bg-white border border-slate-200 rounded-md px-3 py-1 text-sm font-bold text-slate-700 shadow-sm">
                    {page} <span className="text-slate-400 mx-1">/</span> {totalPages}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={page >= totalPages} 
                    onClick={() => { setPage(page + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="h-8 w-8 p-0 transition-transform active:scale-90 border-slate-200"
                    aria-label="Sonraki sayfa"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
