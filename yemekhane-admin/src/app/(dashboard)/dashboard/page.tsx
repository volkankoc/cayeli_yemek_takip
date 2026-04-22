"use client";

import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getDailyReport, getMonthlyReport } from "@/lib/api/reports";
import { getStaffList } from "@/lib/api/staff";
import {
  UtensilsCrossed,
  Users,
  TrendingUp,
  Award,
  ArrowUpRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const PIE_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#e879f9", "#06b6d4"];

export default function DashboardPage() {
  const today = new Date().toISOString().split("T")[0];
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  const { data: dailyReport, isLoading: dailyLoading } = useQuery({
    queryKey: ["dashboard", "daily", today],
    queryFn: () => getDailyReport(today),
    refetchInterval: 30000,
  });

  const { data: monthlyReport, isLoading: monthlyLoading } = useQuery({
    queryKey: ["dashboard", "monthly", year, month],
    queryFn: () => getMonthlyReport(year, month),
    staleTime: 5 * 60 * 1000,
  });

  const { data: staffData } = useQuery({
    queryKey: ["dashboard", "staff"],
    queryFn: () => getStaffList({ is_active: "1", limit: 1 }),
    staleTime: 60 * 1000,
  });

  const topMealType = dailyReport?.by_meal_type?.reduce(
    (max, mt) => (mt.count > max.count ? mt : max),
    { name: "-", count: 0 }
  );

  return (
    <>
      <Header title="Dashboard" />
      <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Welcome Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-6 lg:p-8 text-white relative overflow-hidden animate-fade-in-up">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight">Hoş Geldiniz 👋</h2>
            <p className="text-indigo-100 mt-1 text-sm">
              Bugünün tarih: {new Date().toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Bugünkü Kullanım"
            value={dailyReport?.total_usage ?? 0}
            icon={<UtensilsCrossed className="w-5 h-5" />}
            loading={dailyLoading}
            gradient="stat-gradient-indigo"
            delay="stagger-1"
          />
          <StatCard
            title="Aktif Personel"
            value={staffData?.total ?? 0}
            icon={<Users className="w-5 h-5" />}
            loading={!staffData}
            gradient="stat-gradient-emerald"
            delay="stagger-2"
          />
          <StatCard
            title="Bu Ay Toplam"
            value={monthlyReport?.total_usage ?? 0}
            icon={<TrendingUp className="w-5 h-5" />}
            loading={monthlyLoading}
            gradient="stat-gradient-amber"
            delay="stagger-3"
          />
          <StatCard
            title="En Çok Kullanılan"
            value={topMealType?.name || "-"}
            subtitle={topMealType?.count ? `${topMealType.count} kullanım` : undefined}
            icon={<Award className="w-5 h-5" />}
            loading={dailyLoading}
            gradient="stat-gradient-rose"
            delay="stagger-4"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Scans */}
          <Card className="card-premium animate-fade-in-up stagger-5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Son Okutmalar</CardTitle>
                <span className="text-xs text-indigo-500 font-medium">Canlı</span>
              </div>
            </CardHeader>
            <CardContent>
              {dailyLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : dailyReport?.logs && dailyReport.logs.length > 0 ? (
                <div className="space-y-2">
                  {dailyReport.logs.slice(0, 8).map((log, idx) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-slate-50 transition-colors animate-slide-in-right"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
                          {log.first_name?.charAt(0)}{log.last_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {log.first_name} {log.last_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {log.department_name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="text-xs bg-indigo-50 text-indigo-600 border-0">
                          {log.meal_type_name}
                        </Badge>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">
                          {log.used_at?.split(" ")[1]?.slice(0, 5)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <UtensilsCrossed className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">Bugün henüz okutma yapılmadı</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Usage Chart */}
          <Card className="card-premium animate-fade-in-up stagger-5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Yemek Tipine Göre Kullanım</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyLoading ? (
                <Skeleton className="h-64 w-full rounded-xl" />
              ) : monthlyReport?.by_meal_type ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyReport.by_meal_type}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: "13px",
                      }}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} name="Kullanım" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12">
                  <BarChart className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">Veri bulunamadı</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Department Pie Chart */}
        <Card className="card-premium animate-fade-in-up">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Departman Bazlı Kullanım (Bu Ay)</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyLoading ? (
              <Skeleton className="h-72 w-full rounded-xl" />
            ) : monthlyReport?.by_department && monthlyReport.by_department.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={monthlyReport.by_department.filter((d) => d.count > 0)}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    label
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {monthlyReport.by_department
                      .filter((d) => d.count > 0)
                      .map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      fontSize: "13px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <Building2Icon className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Bu ay henüz veri yok</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Building2Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>
    </svg>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  loading,
  gradient,
  delay,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  loading: boolean;
  gradient: string;
  delay: string;
}) {
  return (
    <Card className={`card-premium animate-fade-in-up ${delay}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-20 mt-2 rounded-lg" />
            ) : (
              <>
                <p className="text-2xl font-bold mt-1.5 text-slate-900 tracking-tight">{value}</p>
                {subtitle && (
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                    {subtitle}
                  </p>
                )}
              </>
            )}
          </div>
          <div className={`p-3 rounded-xl ${gradient} text-white shadow-lg`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
