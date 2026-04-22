"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/hooks/useAuth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Menu,
  LayoutDashboard,
  Users,
  Building2,
  UtensilsCrossed,
  BarChart3,
  CalendarDays,
  Settings,
  UserCog,
} from "lucide-react";
import { useState } from "react";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/personel", label: "Personel", icon: Users },
  { href: "/departmanlar", label: "Departmanlar", icon: Building2 },
  { href: "/yemek-tipleri", label: "Yemek Tipleri", icon: UtensilsCrossed },
  { href: "/raporlar/gunluk", label: "Günlük Rapor", icon: BarChart3 },
  { href: "/raporlar/aylik", label: "Aylık Rapor", icon: BarChart3 },
  { href: "/raporlar/yillik", label: "Yıllık Rapor", icon: BarChart3 },
  { href: "/tatiller", label: "Tatiller", icon: CalendarDays },
];

const adminItems = [
  { href: "/kullanicilar", label: "Kullanıcılar", icon: UserCog },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="lg:hidden rounded-xl" />}
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 bg-[oklch(0.17_0.03_260)] border-0">
        <div className="h-20 flex items-center px-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-white block leading-tight">Yemekhane</span>
              <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-indigo-300/70">Takip Sistemi</span>
            </div>
          </div>
        </div>
        <nav className="py-5 px-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "text-white bg-gradient-to-r from-indigo-500/20 to-violet-500/10"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
                )}
              >
                <item.icon className={cn("w-[18px] h-[18px]", isActive ? "text-indigo-400" : "text-slate-500")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {isAdmin && (
            <>
              <div className="pt-4 pb-2 px-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Yönetim</p>
              </div>
              {adminItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    pathname.startsWith(item.href)
                      ? "text-white bg-gradient-to-r from-indigo-500/20 to-violet-500/10"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
                  )}
                >
                  <item.icon className={cn("w-[18px] h-[18px]", pathname.startsWith(item.href) ? "text-indigo-400" : "text-slate-500")} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
