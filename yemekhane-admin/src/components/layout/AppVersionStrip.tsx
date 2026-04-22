"use client";

import { useEffect, useState } from "react";
import { getApiVersion, type ApiVersionPayload } from "@/lib/api/version";

const adminVersion = process.env.NEXT_PUBLIC_APP_VERSION || "—";

export function AppVersionStrip() {
  const [api, setApi] = useState<ApiVersionPayload | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getApiVersion()
      .then((d) => {
        if (!cancelled) setApi(d);
      })
      .catch(() => {
        if (!cancelled) setErr(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const title = api?.releaseNotes
    ? `Deploy notları (API):\n${api.releaseNotes}`
    : err
      ? "API sürümü alınamadı"
      : undefined;

  return (
    <div
      className="flex flex-col items-end text-right min-w-0 max-w-[min(52vw,280px)] shrink"
      title={title}
    >
      <span className="text-[10px] sm:text-[11px] leading-tight text-slate-400 tabular-nums truncate">
        Admin <span className="text-slate-500 font-medium">v{adminVersion}</span>
        <span className="hidden md:inline">
          {api ? (
            <>
              {" · "}
              API <span className="text-slate-500 font-medium">v{api.version}</span>
            </>
          ) : err ? (
            <span className="text-amber-600/90"> · API ?</span>
          ) : (
            <span className="text-slate-300"> · …</span>
          )}
        </span>
      </span>
      <span className="md:hidden text-[10px] leading-tight text-slate-400 tabular-nums truncate max-w-[200px]">
        {api ? (
          <>
            API <span className="text-slate-500 font-medium">v{api.version}</span>
          </>
        ) : err ? (
          <span className="text-amber-600/90">API sürümü alınamadı</span>
        ) : (
          <span className="text-slate-300">API sürümü…</span>
        )}
      </span>
    </div>
  );
}
