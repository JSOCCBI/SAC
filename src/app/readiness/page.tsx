"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, ShieldCheck, ClipboardList, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Tab = "readiness" | "checklist";

interface ReadinessCallsign {
  callsign: string;
  deficiency_count: number;
  check_name: string;
}

interface TrendDay {
  label: string;
  isToday: boolean;
  total: number;
  clean: number;
  pct: number | null;
}

interface ReadinessData {
  todayTotal: number;
  todayClean: number;
  todayPct: number | null;
  byCallsign: ReadinessCallsign[];
  trend: TrendDay[];
}

interface Submission {
  id: string;
  submitted_at: string;
  started_at: string | null;
  callsign: string | null;
  task_type: string | null;
  partner_1_name: string | null;
  deficiency_count: number;
  total_items: number;
  check_type_name: string;
  check_category: string;
}

function formatDuration(startedAt: string | null, submittedAt: string): string | null {
  if (!startedAt) return null;
  const s = Math.floor((new Date(submittedAt).getTime() - new Date(startedAt).getTime()) / 1000);
  if (s < 0) return null;
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r > 0 ? `${m}m ${r}s` : `${m}m`;
}

function readinessColor(pct: number | null): { text: string; bar: string; bg: string; border: string; badge: string } {
  if (pct === null) return { text: "text-gray-400", bar: "bg-gray-200", bg: "bg-gray-50", border: "border-gray-100", badge: "bg-gray-100 text-gray-500" };
  if (pct === 100)  return { text: "text-emerald-600", bar: "bg-emerald-500", bg: "bg-emerald-50", border: "border-emerald-100", badge: "bg-emerald-100 text-emerald-700" };
  if (pct >= 80)    return { text: "text-amber-600",   bar: "bg-amber-500",   bg: "bg-amber-50",   border: "border-amber-100",   badge: "bg-amber-100 text-amber-700"   };
  return               { text: "text-red-600",     bar: "bg-red-500",     bg: "bg-red-50",     border: "border-red-100",     badge: "bg-red-100 text-red-700"     };
}

const CATEGORY_LABELS: Record<string, string> = {
  pre_deployment: "Pre Deployment",
  "100_percent": "100%",
  daily: "Daily",
};

export default function ReadinessPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("readiness");
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [readinessLoading, setReadinessLoading] = useState(true);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      loadReadiness();
      loadSubmissions();
    };
    check();
  }, [router]);

  async function loadReadiness() {
    setReadinessLoading(true);
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    type ReadinessRow = {
      id: string;
      callsign: string | null;
      deficiency_count: number;
      submitted_at: string;
      check_types: { name: string; category: string } | null;
    };

    const { data: rawSubs } = await supabase
      .from("check_submissions")
      .select("id, callsign, deficiency_count, submitted_at, check_types(name, category)")
      .gte("submitted_at", sevenDaysAgo.toISOString())
      .order("submitted_at", { ascending: true });

    const subs = (rawSubs ?? []) as unknown as ReadinessRow[];

    const dailySubs = subs.filter(s => s.check_types?.category === "daily");

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todaySubs = dailySubs.filter(s => new Date(s.submitted_at) >= todayStart);
    const todayTotal = todaySubs.length;
    const todayClean = todaySubs.filter(s => (s.deficiency_count ?? 0) === 0).length;
    const todayPct = todayTotal > 0 ? Math.round((todayClean / todayTotal) * 100) : null;

    const byCallsign = todaySubs.map(s => ({
      callsign: s.callsign ?? "Unknown",
      deficiency_count: s.deficiency_count ?? 0,
      check_name: s.check_types?.name ?? "",
    })).sort((a, b) => a.callsign.localeCompare(b.callsign));

    const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const trend: TrendDay[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const daySubs = dailySubs.filter(s => {
        const t = new Date(s.submitted_at);
        return t >= d && t < next;
      });
      const total = daySubs.length;
      const clean = daySubs.filter(s => (s.deficiency_count ?? 0) === 0).length;
      return {
        label: DAY_LABELS[d.getDay()],
        isToday: i === 6,
        total,
        clean,
        pct: total > 0 ? Math.round((clean / total) * 100) : null,
      };
    });

    setReadiness({ todayTotal, todayClean, todayPct, byCallsign, trend });
    setReadinessLoading(false);
  }

  async function loadSubmissions() {
    setSubmissionsLoading(true);

    type SubRow = {
      id: string;
      submitted_at: string;
      started_at: string | null;
      callsign: string | null;
      task_type: string | null;
      partner_1_name: string | null;
      deficiency_count: number;
      total_items: number;
      check_types: { name: string; category: string } | null;
    };

    const { data: rawData } = await supabase
      .from("check_submissions")
      .select("id, submitted_at, started_at, callsign, task_type, partner_1_name, deficiency_count, total_items, check_types(name, category)")
      .order("submitted_at", { ascending: false })
      .limit(60);

    const rows: Submission[] = ((rawData ?? []) as unknown as SubRow[]).map(s => ({
      id: s.id,
      submitted_at: s.submitted_at,
      started_at: s.started_at,
      callsign: s.callsign,
      task_type: s.task_type,
      partner_1_name: s.partner_1_name,
      deficiency_count: s.deficiency_count ?? 0,
      total_items: s.total_items ?? 0,
      check_type_name: s.check_types?.name ?? "Unknown",
      check_category: s.check_types?.category ?? "",
    }));

    setSubmissions(rows);
    setSubmissionsLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([loadReadiness(), loadSubmissions()]);
    setRefreshing(false);
  }

  const todayLabel = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "readiness", label: "Readiness",       icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { key: "checklist", label: "Checklist Status", icon: <ClipboardList className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="fixed inset-0 -z-10 sac-grid-bg pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-100" style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)" }}>
        <div className="max-w-4xl mx-auto px-4 flex justify-between items-center h-14">
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 ml-1">
              <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="text-lg font-light text-gray-900 tracking-tight">SOS <span className="font-extrabold">Access</span></span>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700 disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mb-6">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.5px]">Operations</p>
          <h1 className="text-2xl font-light text-gray-900 tracking-tight mt-1">
            Callsign <span className="font-extrabold">Readiness</span>
          </h1>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === t.key ? "bg-black text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Readiness Tab */}
        {tab === "readiness" && (
          readinessLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
          ) : (() => {
            const colors = readinessColor(readiness?.todayPct ?? null);
            const pct = readiness?.todayPct ?? null;
            return (
              <div className="space-y-3">

                {/* Readiness header */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Unit Readiness</span>
                  </div>
                  <span className="text-[11px] text-gray-400">{todayLabel}</span>
                </div>

                {/* Headline card */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"
                >
                  <div className={`px-5 py-4 ${colors.bg} border-b ${colors.border}`}>
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">No Deficiency Rate — Today</p>
                        <div className="flex items-baseline gap-3">
                          <span className={`text-5xl font-extrabold leading-none ${colors.text}`}>
                            {pct !== null ? `${pct}%` : "—"}
                          </span>
                          {pct === 100 && (
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Target met</span>
                          )}
                          {pct !== null && pct < 100 && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>{100 - pct}% below target</span>
                          )}
                          {pct === null && (
                            <span className="text-xs text-gray-400 italic">No submissions yet</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-extrabold text-gray-900">
                          {readiness?.todayClean ?? 0}
                          <span className="text-base font-semibold text-gray-400"> / {readiness?.todayTotal ?? 0}</span>
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">units · no deficiencies</p>
                      </div>
                    </div>
                    <div className="mt-4 relative">
                      <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct ?? 0}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`h-full rounded-full ${colors.bar}`}
                        />
                      </div>
                      <div className="absolute right-0 -top-1 flex flex-col items-center">
                        <div className="w-px h-4 bg-gray-400" />
                        <span className="text-[9px] font-bold text-gray-400 mt-0.5">Target</span>
                      </div>
                    </div>
                  </div>

                  {(readiness?.todayTotal ?? 0) > 0 && (
                    <div className="px-5 py-3 flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1">
                        <CheckCircle2 className="w-3 h-3" /> {readiness?.todayClean} No deficiencies
                      </span>
                      {(readiness?.todayTotal ?? 0) - (readiness?.todayClean ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-100 rounded-full px-2.5 py-1">
                          <XCircle className="w-3 h-3" /> {(readiness?.todayTotal ?? 0) - (readiness?.todayClean ?? 0)} With deficiencies
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>

                {/* 7-day trend */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4"
                >
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">7-Day Trend</p>
                  <div className="grid grid-cols-7 gap-1">
                    {(readiness?.trend ?? []).map((day, i) => {
                      const dc = readinessColor(day.pct);
                      const barH = day.pct !== null ? Math.max(4, Math.round((day.pct / 100) * 40)) : 4;
                      return (
                        <div key={i} className={`flex flex-col items-center gap-1 rounded-xl py-2 px-1 ${day.isToday ? "bg-gray-50" : ""}`}>
                          <span className={`text-[10px] font-bold ${day.isToday ? "text-gray-900" : "text-gray-400"}`}>{day.label}</span>
                          <div className="h-10 flex items-end justify-center w-full">
                            {day.total > 0 ? (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: barH }}
                                transition={{ duration: 0.5, delay: i * 0.05 }}
                                className={`w-5 rounded-sm ${dc.bar}`}
                              />
                            ) : (
                              <div className="w-5 h-1 rounded-sm bg-gray-100" />
                            )}
                          </div>
                          <span className={`text-[10px] font-bold ${day.pct !== null ? dc.text : "text-gray-300"}`}>
                            {day.pct !== null ? `${day.pct}%` : "—"}
                          </span>
                          <span className="text-[9px] text-gray-300">{day.total > 0 ? `${day.total}` : ""}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Per-callsign breakdown */}
                {(readiness?.byCallsign.length ?? 0) > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"
                  >
                    <div className="px-5 py-3 border-b border-gray-50">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Today&apos;s Submissions</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {readiness?.byCallsign.map((row, i) => (
                        <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900">{row.callsign}</p>
                            <p className="text-[11px] text-gray-400 truncate">{row.check_name}</p>
                          </div>
                          {row.deficiency_count === 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1 shrink-0">
                              <CheckCircle2 className="w-3 h-3" /> No Deficiencies
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-full px-2.5 py-1 shrink-0">
                              <XCircle className="w-3 h-3" /> {row.deficiency_count} {row.deficiency_count === 1 ? "Deficiency" : "Deficiencies"}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {(readiness?.todayTotal ?? 0) === 0 && (
                  <div className="bg-white border border-gray-100 rounded-2xl px-5 py-6 text-center">
                    <p className="text-sm text-gray-300 italic">No daily check submissions yet today.</p>
                  </div>
                )}
              </div>
            );
          })()
        )}

        {/* Checklist Status Tab */}
        {tab === "checklist" && (
          submissionsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm text-gray-300 italic">No submissions found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {submissions.map((s, i) => {
                const hasDeficiency = s.deficiency_count > 0;
                const dt = new Date(s.submitted_at);
                const duration = formatDuration(s.started_at, s.submitted_at);
                const categoryLabel = CATEGORY_LABELS[s.check_category] ?? s.check_category;
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
                    className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg">{categoryLabel}</span>
                          {s.callsign && (
                            <span className="text-xs font-bold text-gray-700">{s.callsign}</span>
                          )}
                          {s.task_type && (
                            <span className="text-[11px] text-gray-400">{s.task_type}</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{s.check_type_name}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {s.partner_1_name && (
                            <span className="text-[11px] text-gray-400">{s.partner_1_name}</span>
                          )}
                          <span className="text-[11px] text-gray-400">
                            {dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                            {" "}
                            {dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {duration && (
                            <span className="text-[11px] text-gray-400">{duration}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {hasDeficiency ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-full px-2.5 py-1">
                            <XCircle className="w-3 h-3" /> {s.deficiency_count}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1">
                            <CheckCircle2 className="w-3 h-3" /> Clean
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <p className="text-center text-xs text-gray-400 pt-2">Showing last {submissions.length} submissions</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
