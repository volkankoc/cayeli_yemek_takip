"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useYearlyReport } from "@/lib/hooks/useReports";
import { exportYearlyExcel } from "@/lib/api/reports";
import { saveAs } from "file-saver";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#e11d48"];
const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

export default function YillikRaporPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [exporting, setExporting] = useState(false);
  const { data, isLoading } = useYearlyReport(year);

  const chartData = data?.by_month?.map((m) => ({
    name: MONTHS[m.month - 1],
    total: m.total,
  })) || [];

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportYearlyExcel(year);
      saveAs(blob, `yemekhane_yillik_rapor_${year}.xlsx`);
      toast.success("Excel dosyası indirildi");
    } catch {
      toast.error("Export hatası");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <Header title="Yıllık Rapor" />
      <div className="p-4 lg:p-6 space-y-4">
        <Card>
          <CardContent className="p-4 flex gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Yıl</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <Button onClick={handleExport} variant="outline" disabled={exporting}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Excel İndir
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Yıllık Toplam</p>
            {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className="text-3xl font-bold">{data?.total_usage ?? 0}</p>}
          </CardContent>
        </Card>

        {/* Monthly bar chart */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Aylık Kullanım</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-72 w-full" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} name="Kullanım" /></BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

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

          <Card><CardHeader><CardTitle className="text-lg">Yemek Tipi Dağılımı</CardTitle></CardHeader><CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> : data?.by_meal_type && data.by_meal_type.some(d => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart><Pie data={data.by_meal_type.filter(d => d.count > 0)} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {data.by_meal_type.filter(d => d.count > 0).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie><Tooltip /><Legend /></PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Veri yok</p>}
          </CardContent></Card>
        </div>
      </div>
    </>
  );
}
