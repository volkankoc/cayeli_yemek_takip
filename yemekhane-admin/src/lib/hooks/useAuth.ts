"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";

export function useAuth() {
  const router = useRouter();
  const { user, token, isAuthenticated, login, logout, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return {
    user,
    token,
    isAuthenticated,
    login,
    logout: handleLogout,
    isAdmin: user?.role === "admin",
  };
}
