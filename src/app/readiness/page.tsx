"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Loader2, ShieldCheck, ClipboardList,
  CheckCircle2, XCircle, RefreshCw,
  CheckCircle, AlertCircle, ChevronRight, X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Tab = "readiness" | "checklist";

// ── Readiness tab types ──────────────────────────────────────────────────────
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

// ── Checklist Status tab types ───────────────────────────────────────────────
type SubEntry = {
  id: string;
  check_type_id: string;
  check_type_name: string;
  category: string;
  submitted_at: string;
  partner_1_name: string;
  deficiency_count: number;
};

type ChecklistUnit = {
  id: string;
  callsign: string;
  submissions: SubEntry[];
};

type RequirementRow = {
  callsign_id: string;
  check_type_id: string;
  days_of_week: number[];
  check_type_name: string;
};

interface ChecklistData {
  statuses: ChecklistUnit[];
  requirements: RequirementRow[];
  isoDay: number;
  dateStr: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
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

// ── Component ────────────────────────────────────────────────────────────────
export default function ReadinessPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("readiness");
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(true);
  const [checklistData, setChecklistData] = useState<ChecklistData | null>(null);
  const [checklistLoading, setChecklistLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<ChecklistUnit | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      loadReadiness();
      loadChecklistStatus();
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

  async function loadChecklistStatus() {
    setChecklistLoading(true);

    const now = new Date();
    const astNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const dateStr = astNow.toISOString().slice(0, 10);
    const dayStart = new Date(`${dateStr}T00:00:00+03:00`).toISOString();
    const nextDay = new Date(`${dateStr}T00:00:00+03:00`);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayEnd = nextDay.toISOString();

    type RawSub = {
      id: string;
      callsign: string | null;
      check_type_id: string;
      submitted_at: string;
      partner_1_name: string;
      deficiency_count: number | null;
      check_types: { name: string; category: string } | null;
    };
    type RawReq = {
      callsign_id: string;
      check_type_id: string;
      days_of_week: number[];
      check_types: { name: string } | null;
    };

    const [{ data: units }, { data: rawSubs }, { data: rawReqs }] = await Promise.all([
      supabase.from("callsigns").select("id, callsign").eq("active", true).order("callsign"),
      supabase
        .from("check_submissions")
        .select("id, callsign, check_type_id, submitted_at, partner_1_name, deficiency_count, check_types(name, category)")
        .gte("submitted_at", dayStart)
        .lt("submitted_at", dayEnd)
        .order("submitted_at", { ascending: false }),
      supabase
        .from("callsign_check_requirements")
        .select("callsign_id, check_type_id, days_of_week, check_types(name)"),
    ]);

    type RawUnit = { id: string; callsign: string };

    const unitRows = (units ?? []) as unknown as RawUnit[];
    const subs = (rawSubs ?? []) as unknown as RawSub[];
    const requirements: RequirementRow[] = ((rawReqs ?? []) as unknown as RawReq[]).map(r => ({
      callsign_id: r.callsign_id,
      check_type_id: r.check_type_id,
      days_of_week: r.days_of_week ?? [],
      check_type_name: r.check_types?.name ?? "—",
    }));

    const isoDay = astNow.getDay() === 0 ? 7 : astNow.getDay();

    const statuses: ChecklistUnit[] = unitRows.map(u => {
      const unitSubs = subs.filter(s => s.callsign === u.callsign);
      const submissions: SubEntry[] = unitSubs.map(s => ({
        id: s.id,
        check_type_id: s.check_type_id,
        check_type_name: s.check_types?.name ?? "—",
        category: s.check_types?.category ?? "",
        submitted_at: s.submitted_at,
        partner_1_name: s.partner_1_name,
        deficiency_count: s.deficiency_count ?? 0,
      }));
      return { id: u.id, callsign: u.callsign, submissions };
    });

    const sorted = [...statuses].sort((a, b) => {
      const score = (unit: ChecklistUnit) => {
        const unitReqs = requirements.filter(r => r.callsign_id === unit.id);
        if (unitReqs.length === 0) return 1;
        const todayReqs = unitReqs.filter(r => r.days_of_week.includes(isoDay));
        const done = todayReqs.length === 0 || todayReqs.every(req => unit.submissions.some(s => s.check_type_id === req.check_type_id));
        return done ? 2 : 0;
      };
      const diff = score(a) - score(b);
      return diff !== 0 ? diff : a.callsign.localeCompare(b.callsign);
    });

    setChecklistData({ statuses: sorted, requirements, isoDay, dateStr });
    setChecklistLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([loadReadiness(), loadChecklistStatus()]);
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
      <header className="sticky top-0 z-40 border-b border-gray-100 sac-header-bg" style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)" }}>
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

        {/* ── Readiness Tab ── */}
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
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Unit Readiness</span>
                  </div>
                  <span className="text-[11px] text-gray-400">{todayLabel}</span>
                </div>

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

        {/* ── Checklist Status Tab ── */}
        {tab === "checklist" && (
          checklistLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-400 mb-3">
                {checklistData?.statuses.length ?? 0} units ·{" "}
                {checklistData?.dateStr
                  ? new Date(`${checklistData.dateStr}T12:00:00+03:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                  : ""}
              </p>
              <div className="space-y-2">
                {(checklistData?.statuses ?? []).map((unit, i) => {
                  const unitReqs = (checklistData?.requirements ?? []).filter(r => r.callsign_id === unit.id);
                  const hasAnyReqs = unitReqs.length > 0;
                  const isoDay = checklistData?.isoDay ?? 1;
                  const requiredToday = unitReqs.filter(r => r.days_of_week.includes(isoDay));
                  const allDone: boolean | null = !hasAnyReqs
                    ? null
                    : requiredToday.length === 0 || requiredToday.every(req => unit.submissions.some(s => s.check_type_id === req.check_type_id));
                  const borderClass = allDone === false ? "border-red-100 hover:border-red-200" : "border-gray-100 hover:border-gray-200";
                  return (
                    <motion.div
                      key={unit.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                      onClick={() => setSelectedUnit(unit)}
                      className={`bg-white border rounded-2xl shadow-sm px-5 py-4 cursor-pointer hover:shadow-md transition-all ${borderClass}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="font-extrabold text-sm text-gray-900">{unit.callsign}</span>
                        <div className="flex items-center gap-2">
                          {allDone === null ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-gray-100 text-gray-400">
                              Not configured
                            </span>
                          ) : allDone ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-green-50 text-green-600">
                              Complete
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-red-50 text-red-500">
                              Incomplete
                            </span>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {!hasAnyReqs ? (
                          <p className="text-xs text-gray-400 italic">No requirements configured.</p>
                        ) : requiredToday.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No checks required today.</p>
                        ) : (
                          requiredToday.map(req => {
                            const sub = unit.submissions.find(s => s.check_type_id === req.check_type_id);
                            return (
                              <div key={req.check_type_id} className="flex items-start gap-2">
                                {sub ? (
                                  <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                                ) : (
                                  <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                                )}
                                <span className="text-xs font-semibold text-gray-700 truncate max-w-[120px]">{req.check_type_name}</span>
                                {sub ? (
                                  <span className="text-xs text-gray-400 ml-auto shrink-0">
                                    {new Date(sub.submitted_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Qatar" })}
                                    {" · "}{sub.partner_1_name}
                                    {sub.deficiency_count > 0 && (
                                      <span className="ml-1.5 font-bold text-red-500">{sub.deficiency_count} def</span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400 italic ml-auto">Not submitted</span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>

      {/* ── Unit Detail Modal ── */}
      <AnimatePresence>
        {selectedUnit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
            onClick={() => setSelectedUnit(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-50">
                <div>
                  <h2 className="font-extrabold text-gray-900">{selectedUnit.callsign}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Today&apos;s submissions</p>
                </div>
                <button onClick={() => setSelectedUnit(null)} className="p-1.5 rounded-xl hover:bg-gray-100">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-3 max-h-[70vh] overflow-y-auto">
                {selectedUnit.submissions.length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center py-4">No submissions for today.</p>
                ) : (
                  selectedUnit.submissions.map(sub => (
                    <div key={sub.id} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 leading-snug">{sub.check_type_name}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">
                            {CATEGORY_LABELS[sub.category] ?? sub.category}
                          </p>
                        </div>
                        {sub.deficiency_count > 0 ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 shrink-0 mt-0.5">
                            <AlertCircle className="w-3 h-3" />
                            {sub.deficiency_count} def
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-green-500 shrink-0 mt-0.5">
                            <CheckCircle className="w-3 h-3" />
                            Clear
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(sub.submitted_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Qatar" })}
                        {" · "}{sub.partner_1_name}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
