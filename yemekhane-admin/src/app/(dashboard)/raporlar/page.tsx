"use client";

import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { CalendarDays, CalendarRange, CalendarClock } from "lucide-react";

export default function RaporlarPage() {
  const reports = [
    { href: "/raporlar/gunluk", title: "Günlük Rapor", desc: "Bugünün yemek kullanım detayları", icon: CalendarDays, color: "blue" },
    { href: "/raporlar/aylik", title: "Aylık Rapor", desc: "Aylık kullanım özet ve detayları", icon: CalendarRange, color: "green" },
    { href: "/raporlar/yillik", title: "Yıllık Rapor", desc: "Yıllık kullanım istatistikleri", icon: CalendarClock, color: "purple" },
  ];

  return (
    <>
      <Header title="Raporlar" />
      <div className="p-4 lg:p-6">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Rapor</th>
                    <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Açıklama</th>
                    <th className="text-right p-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Git</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.href} className="border-b">
                      <td className="p-3">
                        <div className="flex items-center gap-2 font-medium">
                          <r.icon className="w-4 h-4 text-slate-600" />
                          {r.title}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-slate-600">{r.desc}</td>
                      <td className="p-3 text-right">
                        <Link href={r.href} className="text-sm font-medium text-indigo-600 hover:underline">
                          Aç
                        </Link>
                      </td>
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
