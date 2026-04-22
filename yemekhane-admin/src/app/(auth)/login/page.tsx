"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { login as loginApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UtensilsCrossed, ShieldCheck } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Kullanıcı adı gerekli"),
  password: z.string().min(1, "Şifre gerekli"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    try {
      const result = await loginApi(data);
      login(result.token, result.user);
      toast.success("Giriş başarılı!");
      router.push("/dashboard");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
        backgroundSize: "50px 50px"
      }} />

      {/* Login Card */}
      <div className="relative w-full max-w-md mx-4 animate-fade-in-up">
        <div className="bg-white/[0.07] backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-5 shadow-xl shadow-indigo-500/25 animate-float">
              <UtensilsCrossed className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Yemekhane Takip Sistemi
            </h1>
            <p className="text-sm text-slate-400 mt-2">Yönetim paneline giriş yapın</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm font-medium">Kullanıcı Adı</Label>
              <Input
                placeholder="Kullanıcı adınızı girin"
                {...register("username")}
                autoFocus
                className="h-12 bg-white/[0.06] border-white/10 text-white placeholder:text-slate-500 rounded-xl focus:border-indigo-400 focus:ring-indigo-400/20 transition-all"
              />
              {errors.username && (
                <p className="text-sm text-rose-400">{errors.username.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm font-medium">Şifre</Label>
              <Input
                type="password"
                placeholder="Şifrenizi girin"
                {...register("password")}
                className="h-12 bg-white/[0.06] border-white/10 text-white placeholder:text-slate-500 rounded-xl focus:border-indigo-400 focus:ring-indigo-400/20 transition-all"
              />
              {errors.password && (
                <p className="text-sm text-rose-400">{errors.password.message}</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-base shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Giriş Yap
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Güvenli bağlantı ile korunmaktadır</span>
          </div>
        </div>
      </div>
    </div>
  );
}
