"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Settings, Sparkles, RefreshCw, Megaphone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatLastFirst } from "@/lib/utils";

type UserProfile = {
  id: string;
  full_name: string | null;
  role: "staff" | "manager";
  active: boolean;
  created_at: string;
};

type AuditEntry = {
  id: string;
  user_email: string;
  action: string;
  created_at: string;
};

type AppBadge = { label: string; color: string };

const APP_ACCESS: Record<string, AppBadge[]> = {
  staff: [{ label: "SEC", color: "bg-gray-100 text-gray-600" }],
  manager: [
    { label: "SEC", color: "bg-gray-100 text-gray-600" },
    { label: "IMS", color: "bg-gray-100 text-gray-600" },
    { label: "SAC", color: "bg-gray-900 text-white" },
  ],
};

const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
};

const NEW_USER_DAYS = 14;

function daysBefore(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function isNew(createdAt: string) {
  return new Date(createdAt) >= new Date(daysBefore(NEW_USER_DAYS));
}

export default function DashboardPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "staff" | "manager" | "new">("all");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    setCurrentUserId(session.user.id);
    setCurrentUserEmail(session.user.email ?? null);

    const [{ data: userData }, { data: logData }] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("id, full_name, role, active, created_at")
        .order("full_name"),
      supabase
        .from("inventory_audit_log")
        .select("id, user_email, action, created_at")
        .like("action", "[Access]%")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    setUsers(((userData as UserProfile[]) || []).sort((a, b) =>
      formatLastFirst(a.full_name || "").localeCompare(formatLastFirst(b.full_name || ""))
    ));
    setAuditLog((logData as AuditEntry[]) || []);
    setLoading(false);
  }

  async function logAccess(action: string) {
    if (!currentUserEmail) return;
    await supabase.from("inventory_audit_log").insert({
      user_email: currentUserEmail,
      action: `[Access] ${action}`,
    });
    // Refresh log
    const { data } = await supabase
      .from("inventory_audit_log")
      .select("id, user_email, action, created_at")
      .like("action", "[Access]%")
      .order("created_at", { ascending: false })
      .limit(8);
    setAuditLog((data as AuditEntry[]) || []);
  }

  async function toggleRole(user: UserProfile) {
    const newRole = user.role === "staff" ? "manager" : "staff";
    setUpdating(user.id);

    const { data, error } = await supabase
      .from("user_profiles")
      .update({ role: newRole })
      .eq("id", user.id)
      .select("id");

    if (error || !data || data.length === 0) {
      showToast("Failed to update role. Check permissions.", "error");
    } else {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      showToast(`${user.full_name || "User"} is now ${newRole}.`, "success");
      await logAccess(`${user.full_name || "Unknown"} role changed to ${newRole}`);
    }
    setUpdating(null);
  }

  async function toggleActive(user: UserProfile) {
    setUpdating(user.id + "_active");
    const newActive = !user.active;
    const { data, error } = await supabase
      .from("user_profiles")
      .update({ active: newActive })
      .eq("id", user.id)
      .select("id");

    if (error || !data || data.length === 0) {
      showToast("Failed to update status. Check permissions.", "error");
    } else {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: newActive } : u));
      showToast(`${user.full_name || "User"} ${newActive ? "activated" : "deactivated"}.`, "success");
      await logAccess(`${user.full_name || "Unknown"} ${newActive ? "activated" : "deactivated"}`);
    }
    setUpdating(null);
  }

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const newUserCount = users.filter(u => isNew(u.created_at)).length;
  const staffCount   = users.filter(u => u.role === "staff").length;
  const managerCount = users.filter(u => u.role === "manager").length;

  const filtered = users.filter(u => {
    const matchSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) ?? false;
    if (filter === "new")     return matchSearch && isNew(u.created_at);
    if (filter === "staff")   return matchSearch && u.role === "staff";
    if (filter === "manager") return matchSearch && u.role === "manager";
    return matchSearch;
  });

  const filterTabs: { key: "all" | "staff" | "manager" | "new"; label: string; badge?: number }[] = [
    { key: "all",     label: "All" },
    { key: "new",     label: "New", badge: newUserCount },
    { key: "staff",   label: "Staff" },
    { key: "manager", label: "Manager" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="fixed inset-0 -z-10 sac-grid-bg pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-100" style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)" }}>
        <div className="max-w-4xl mx-auto px-4 flex justify-between items-center h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-lg font-light text-gray-900 tracking-tight">SOS <span className="font-extrabold">Access</span></span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700 disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => router.push("/settings")}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 font-medium transition-colors px-2 py-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Title */}
        <motion.div {...fadeInUp} className="mb-6">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.5px]">User Management</p>
          <h1 className="text-2xl font-light text-gray-900 tracking-tight mt-1">
            Manage <span className="font-extrabold">Access</span>
          </h1>
        </motion.div>

        {/* Quick actions */}
        <motion.div {...fadeInUp} transition={{ delay: 0.02, ...fadeInUp.transition }} className="mb-6">
          <button
            onClick={() => router.push("/release-notes")}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 flex items-center justify-between gap-3 hover:bg-gray-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Megaphone className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Release Notes</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Publish What&apos;s New for SEC &amp; IMS</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-300 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div {...fadeInUp} transition={{ delay: 0.04, ...fadeInUp.transition }} className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total Users", value: users.length },
            { label: "Staff", value: staffCount },
            { label: "Managers", value: managerCount },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
              <p className="text-2xl font-extrabold text-gray-900">{loading ? "—" : stat.value}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.5px] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Access Log */}
        {auditLog.length > 0 && (
          <motion.div {...fadeInUp} transition={{ delay: 0.06, ...fadeInUp.transition }}
            className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 mb-5"
          >
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.5px] mb-3">Access Log</p>
            <div className="space-y-2.5">
              {auditLog.map(entry => {
                const dt = new Date(entry.created_at);
                const action = entry.action.replace(/^\[Access\]\s*/, "");
                return (
                  <div key={entry.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-700 font-medium leading-snug">{action}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{entry.user_email}</p>
                    </div>
                    <span className="text-[11px] text-gray-400 shrink-0 pt-0.5">
                      {dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      {" "}
                      {dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Search + Filter tabs */}
        <motion.div {...fadeInUp} transition={{ delay: 0.08, ...fadeInUp.transition }} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users…"
              className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors bg-white"
            />
          </div>
          <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-white text-sm">
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`relative px-3 py-2.5 font-medium transition-colors flex items-center gap-1.5 ${filter === tab.key ? "bg-black text-white" : "text-gray-500 hover:text-gray-700"}`}
              >
                {tab.key === "new" && <Sparkles className="w-3 h-3" />}
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filter === tab.key ? "bg-white/20 text-white" : "bg-amber-100 text-amber-600"}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* New users helper banner */}
        {filter === "new" && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
            className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-4"
          >
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-800">New registrations — last {NEW_USER_DAYS} days</p>
              <p className="text-[11px] text-amber-600 mt-0.5">Review each user and set their role and active status as needed.</p>
            </div>
          </motion.div>
        )}

        {/* User list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div {...fadeInUp} className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
            <p className="text-gray-400 text-sm">
              {filter === "new" ? `No new users in the last ${NEW_USER_DAYS} days.` : "No users found."}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial="initial"
            animate="animate"
            variants={{ animate: { transition: { staggerChildren: 0.04 } } }}
            className="space-y-3"
          >
            {filtered.map(user => {
              const userIsNew = isNew(user.created_at);
              return (
                <motion.div
                  key={user.id}
                  variants={fadeInUp}
                  className={`bg-white rounded-2xl border p-4 shadow-sm transition-all ${!user.active ? "opacity-50 border-gray-100" : userIsNew ? "border-amber-200" : "border-gray-100 hover:border-gray-200"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Avatar + name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${user.role === "manager" ? "bg-black" : "bg-gray-400"}`}>
                        {formatLastFirst(user.full_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {user.full_name ? formatLastFirst(user.full_name) : "—"}
                            {user.id === currentUserId && (
                              <span className="ml-1.5 text-xs font-normal text-gray-400">(you)</span>
                            )}
                          </p>
                          {userIsNew && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-lg shrink-0">
                              <Sparkles className="w-2.5 h-2.5" /> New
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Active toggle */}
                      <button
                        onClick={() => toggleActive(user)}
                        disabled={updating === user.id + "_active" || user.id === currentUserId}
                        title={user.active ? "Deactivate" : "Activate"}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 ${user.active ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-gray-50 text-gray-400 hover:bg-gray-100"}`}
                      >
                        {updating === user.id + "_active" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : user.active ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                          </svg>
                        )}
                      </button>

                      {/* Role toggle */}
                      <button
                        onClick={() => toggleRole(user)}
                        disabled={updating === user.id || user.id === currentUserId}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          user.role === "manager"
                            ? "bg-black text-white hover:bg-gray-800"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {updating === user.id ? <Loader2 className="w-3 h-3 animate-spin" /> : user.role === "manager" ? "Manager" : "Staff"}
                      </button>
                    </div>
                  </div>

                  {/* App access badges */}
                  <div className="flex items-center gap-1.5 mt-3 pl-[52px]">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4px] mr-0.5">Access:</span>
                    {APP_ACCESS[user.role].map(badge => (
                      <span key={badge.label} className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${badge.color}`}>
                        {badge.label}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {!loading && filtered.length > 0 && (
          <p className="text-center text-xs text-gray-400 mt-6">
            {filtered.length} of {users.length} users · Tap a role to toggle
          </p>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-medium shadow-lg z-50 ${
              toast.type === "success" ? "bg-gray-900 text-white" : "bg-red-500 text-white"
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
