"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  LayoutDashboard,
  Users,
  Building2,
  UtensilsCrossed,
  BarChart3,
  CalendarDays,
  Settings,
  UserCog,
  ClipboardList,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { useState } from "react";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/personel", label: "Personel", icon: Users },
  { href: "/departmanlar", label: "Departmanlar", icon: Building2 },
  { href: "/yemek-tipleri", label: "Yemek Tipleri", icon: UtensilsCrossed },
  {
    label: "Raporlar",
    icon: BarChart3,
    children: [
      { href: "/raporlar/gunluk", label: "Günlük Rapor" },
      { href: "/raporlar/aylik", label: "Aylık Rapor" },
      { href: "/raporlar/yillik", label: "Yıllık Rapor" },
    ],
  },
  { href: "/tatiller", label: "Tatiller", icon: CalendarDays },
];

const adminItems = [
  { href: "/kullanicilar", label: "Kullanıcılar", icon: UserCog },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
  { href: "/loglar", label: "İşlem Logları", icon: ClipboardList },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const [reportsOpen, setReportsOpen] = useState(
    pathname.startsWith("/raporlar")
  );

  return (
    <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 bg-[oklch(0.17_0.03_260)] text-white">
      {/* Logo */}
      <div className="h-20 flex items-center px-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight block leading-tight">Yemekhane</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-indigo-300/70">Takip Sistemi</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
          Ana Menü
        </p>
        {menuItems.map((item) => {
          if ("children" in item && item.children) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => setReportsOpen(!reportsOpen)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    reportsOpen
                      ? "text-white bg-white/10"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
                  )}
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      reportsOpen && "rotate-180"
                    )}
                  />
                </button>
                <div className={cn(
                  "overflow-hidden transition-all duration-200",
                  reportsOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                )}>
                  <div className="ml-9 mt-1 space-y-0.5 border-l border-white/[0.08] pl-3">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "block px-3 py-2 rounded-lg text-sm transition-all duration-200",
                          pathname === child.href
                            ? "text-white font-medium bg-white/10"
                            : "text-slate-500 hover:text-white hover:bg-white/[0.04]"
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          const isActive = pathname.startsWith(item.href!);

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                isActive
                  ? "text-white bg-gradient-to-r from-indigo-500/20 to-violet-500/10 shadow-inner"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
              )}
            >
              <div className={cn(
                "w-[18px] h-[18px] transition-colors duration-200",
                isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
              )}>
                <item.icon className="w-full h-full" />
              </div>
              <span>{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400/50" />
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-6 pb-2 px-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                Yönetim
              </p>
            </div>
            {adminItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                    isActive
                      ? "text-white bg-gradient-to-r from-indigo-500/20 to-violet-500/10"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
                  )}
                >
                  <div className={cn(
                    "w-[18px] h-[18px] transition-colors duration-200",
                    isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
                  )}>
                    <item.icon className="w-full h-full" />
                  </div>
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  )}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User Profile */}
      <div className="border-t border-white/[0.08] p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
            {user?.username?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all duration-200"
            title="Çıkış"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
