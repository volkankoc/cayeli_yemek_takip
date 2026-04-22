"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMonthlyReport } from "@/lib/hooks/useReports";
import { exportMonthlyExcel } from "@/lib/api/reports";
import { saveAs } from "file-saver";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#e11d48"];
const MONTHS = ["", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

export default function AylikRaporPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [exporting, setExporting] = useState(false);
  const { data, isLoading } = useMonthlyReport(year, month);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportMonthlyExcel(year, month);
      saveAs(blob, `yemekhane_aylik_rapor_${year}_${String(month).padStart(2, "0")}.xlsx`);
      toast.success("Excel dosyası indirildi");
    } catch {
      toast.error("Export hatası");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <Header title="Aylık Rapor" />
      <div className="p-4 lg:p-6 space-y-4">
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Yıl</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ay</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <Button onClick={handleExport} variant="outline" disabled={exporting}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Excel İndir
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Toplam</p>{isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className="text-2xl font-bold">{data?.total_usage ?? 0}</p>}</CardContent></Card>
          {data?.by_meal_type?.map((mt) => (
            <Card key={mt.id}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{mt.name}</p><p className="text-2xl font-bold">{mt.count}</p></CardContent></Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card><CardHeader><CardTitle className="text-lg">Departman Dağılımı</CardTitle></CardHeader><CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> : data?.by_department && data.by_department.some(d => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart><Pie data={data.by_department.filter(d => d.count > 0)} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {data.by_department.filter(d => d.count > 0).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie><Tooltip /><Legend /></PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Veri yok</p>}
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="text-lg">Yemek Tipine Göre</CardTitle></CardHeader><CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> : data?.by_meal_type ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.by_meal_type}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="Kullanım" /></BarChart>
              </ResponsiveContainer>
            ) : null}
          </CardContent></Card>
        </div>

        {/* Staff Summary */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Personel Özet</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b bg-slate-50">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Ad Soyad</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden md:table-cell">Departman</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Kota</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Kullanılan</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Kalan</th>
                </tr></thead>
                <tbody>
                  {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b"><td className="p-4" colSpan={5}><Skeleton className="h-5 w-full" /></td></tr>
                  )) : data?.staff_summary?.map((s) => (
                    <tr key={s.staff.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => window.location.href = `/personel/${s.staff.id}`}>
                      <td className="p-4 text-sm font-medium">{s.staff.first_name} {s.staff.last_name}</td>
                      <td className="p-4 text-sm text-muted-foreground hidden md:table-cell">{s.staff.department}</td>
                      <td className="p-4 text-sm text-right">{s.total_quota}</td>
                      <td className="p-4 text-sm text-right">{s.total_used}</td>
                      <td className="p-4 text-sm text-right font-medium">{s.remaining}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
