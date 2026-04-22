"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useDailyReport } from "@/lib/hooks/useReports";
import { cn } from "@/lib/utils";
import { 
  AlertCircle, 
  RefreshCcw, 
  Calendar, 
  Clock, 
  SearchX,
  TrendingUp,
  Utensils,
  Coffee,
  Moon,
  Zap
} from "lucide-react";

// Semantic colors for meal types
const MEAL_TYPE_STYLES: Record<string, { 
  bg: string; 
  text: string; 
  border: string; 
  icon: any;
  accent: string;
}> = {
  "Kahvaltı": { 
    bg: "bg-amber-50", 
    text: "text-amber-700", 
    border: "border-amber-100", 
    icon: Coffee,
    accent: "bg-amber-500" 
  },
  "Öğle": { 
    bg: "bg-orange-50", 
    text: "text-orange-700", 
    border: "border-orange-100", 
    icon: Utensils,
    accent: "bg-orange-500" 
  },
  "Akşam": { 
    bg: "bg-indigo-50", 
    text: "text-indigo-700", 
    border: "border-indigo-100", 
    icon: Moon,
    accent: "bg-indigo-500" 
  },
  "default": { 
    bg: "bg-slate-50", 
    text: "text-slate-700", 
    border: "border-slate-100", 
    icon: Zap,
    accent: "bg-slate-500" 
  }
};

const getMealStyle = (name: string) => {
  if (name.includes("Kahvaltı")) return MEAL_TYPE_STYLES["Kahvaltı"];
  if (name.includes("Öğle")) return MEAL_TYPE_STYLES["Öğle"];
  if (name.includes("Akşam")) return MEAL_TYPE_STYLES["Akşam"];
  return MEAL_TYPE_STYLES["default"];
};

export default function GunlukRaporPage() {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const { data, isLoading, isError, refetch } = useDailyReport(date);

  const formatNumber = (num: number) => new Intl.NumberFormat('tr-TR').format(num);

  return (
    <>
      <Header title="Günlük Rapor" />
      <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
        {/* Filter Card */}
        <Card className="shadow-sm border-slate-200/60 stagger-1 animate-fade-in-up">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 w-full sm:w-auto">
              <label htmlFor="report-date" className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-500" />
                Rapor Tarihi
              </label>
              <Input 
                id="report-date"
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="w-full sm:w-48 transition-all focus:ring-2 focus:ring-indigo-500/20 border-slate-200" 
                max={today}
                aria-label="Rapor tarihini seçin"
              />
            </div>
            {isError && (
              <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-rose-600 hover:bg-rose-50 active:scale-95">
                <RefreshCcw className="mr-2 h-4 w-4" /> Yenile
              </Button>
            )}
          </CardContent>
        </Card>

        {isError ? (
          <Card className="border-rose-200 bg-rose-50/30 animate-fade-in-up">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center justify-center gap-3">
                <AlertCircle className="h-10 w-10 text-rose-500" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg text-slate-900">Rapor yüklenemedi</h3>
                  <p className="text-slate-500 text-sm font-medium">Veriler alınırken bir sunucu hatası oluştu.</p>
                </div>
                <Button variant="outline" onClick={() => refetch()} className="mt-4 active:scale-95 border-rose-200 text-rose-700 hover:bg-rose-50">
                  <RefreshCcw className="mr-2 h-4 w-4" /> Tekrar Dene
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-indigo-600 border-none shadow-lg shadow-indigo-500/20 text-white stagger-2 animate-fade-in-up">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center text-white">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-[0.1em]">Toplam Kullanım</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-20 mt-1 bg-white/20" />
                    ) : (
                      <p className="text-2xl font-black truncate animate-fade-in">
                        {formatNumber(data?.total_usage ?? 0)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="shadow-sm border-slate-100 stagger-2 animate-fade-in-up" style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
                    <CardContent className="p-5 flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-xl" />
                      <div className="flex-1">
                        <Skeleton className="h-3 w-20 mb-2" />
                        <Skeleton className="h-7 w-12" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                data?.by_meal_type?.map((mt, idx) => {
                  const style = getMealStyle(mt.name);
                  const Icon = style.icon;
                  return (
                    <Card 
                      key={mt.id} 
                      className={cn(
                        "shadow-sm transition-all hover:shadow-md hover:-translate-y-1 stagger-2 animate-fade-in-up border",
                        style.border
                      )}
                      style={{ animationDelay: `${0.1 + idx * 0.05}s` }}
                    >
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center transition-colors shadow-sm",
                          style.bg, style.text
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-[10px] font-bold uppercase tracking-[0.1em] truncate", style.text)} title={mt.name}>
                            {mt.name}
                          </p>
                          <p className="text-2xl font-black text-slate-900 truncate animate-fade-in">
                            {formatNumber(mt.count)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Detail Table */}
            <Card className="shadow-sm border-slate-200/60 overflow-hidden stagger-3 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <CardHeader className="bg-slate-50/50 border-b py-4">
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-slate-500">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  Kullanım Detayı
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] md:min-w-0">
                    <thead>
                      <tr className="border-b bg-slate-50/50">
                        <th scope="col" className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] w-24">Saat</th>
                        <th scope="col" className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Personel</th>
                        <th scope="col" className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] hidden md:table-cell">Departman</th>
                        <th scope="col" className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] w-32">Yemek Tipi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            <td className="px-6 py-4"><Skeleton className="h-4 w-12" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
                            <td className="px-6 py-4 hidden md:table-cell"><Skeleton className="h-4 w-32" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                          </tr>
                        ))
                      ) : data?.logs && data.logs.length > 0 ? (
                        data.logs.map((log, idx) => {
                          const style = getMealStyle(log.meal_type_name);
                          return (
                            <tr 
                              key={log.id} 
                              className="hover:bg-slate-50 transition-all duration-200 group"
                              style={{ animationDelay: `${0.25 + idx * 0.02}s` }}
                            >
                              <td className="px-6 py-4 text-sm font-mono font-medium text-slate-400 group-hover:text-indigo-600 transition-colors">
                                {log.used_at?.split(" ")[1]?.slice(0, 5) || "--:--"}
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 truncate block max-w-[200px]">
                                  {log.first_name} {log.last_name}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-slate-500 hidden md:table-cell">
                                <span className="truncate block max-w-[200px]">
                                  {log.department_name}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <Badge 
                                  variant="secondary" 
                                  className={cn(
                                    "font-bold text-[10px] uppercase tracking-wider transition-all duration-300 border shadow-sm",
                                    style.bg, style.text, style.border
                                  )}
                                >
                                  {log.meal_type_name}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-16 text-center">
                            <div className="flex flex-col items-center justify-center gap-4 text-slate-300 animate-fade-in">
                              <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                                <SearchX className="h-8 w-8 opacity-40" />
                              </div>
                              <div className="space-y-1">
                                <p className="font-bold text-slate-900">Bu tarihte kullanım bulunamadı</p>
                                <p className="text-xs font-medium">Başka bir tarih seçerek tekrar deneyebilirsiniz.</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
