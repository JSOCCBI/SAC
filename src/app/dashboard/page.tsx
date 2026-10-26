"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Settings, RefreshCw, ShieldCheck, Activity } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatLastFirst } from "@/lib/utils";

const SACLogo = () => (
  <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>
  </div>
);

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
};

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    const { data } = await supabase
      .from("user_profiles")
      .select("full_name, first_name, last_name")
      .eq("id", session.user.id)
      .single();

    if (data) {
      const name = data.first_name && data.last_name
        ? `${data.last_name} ${data.first_name}`
        : formatLastFirst(data.full_name || "");
      setUserName(name);
    }
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut().catch(() => {});
    router.replace("/login");
  }

  const navItems = [
    {
      label: "Manage Access",
      description: "Review and manage staff roles and system access",
      icon: <ShieldCheck className="w-6 h-6 text-gray-700" />,
      route: "/manage-access",
    },
    {
      label: "Callsign Readiness",
      description: "Daily check status and submission history",
      icon: <Activity className="w-6 h-6 text-gray-700" />,
      route: "/readiness",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="fixed inset-0 -z-10 sac-grid-bg pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-100 sac-header-bg" style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)" }}>
        <div className="max-w-4xl mx-auto px-4 flex justify-between items-center h-14">
          <div className="flex items-center gap-2.5">
            <SACLogo />
            <span className="text-lg font-light text-gray-900 tracking-tight">SOS <span className="font-extrabold">Access</span></span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700 disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => router.push("/settings")}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
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
        <motion.div {...fadeInUp} className="mb-8">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.5px]">Welcome back</p>
          <h1 className="text-2xl font-light text-gray-900 tracking-tight mt-1">
            {userName ? (
              <><span className="font-extrabold">{userName}</span></>
            ) : (
              <span className="font-extrabold">Dashboard</span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{greeting()} — have a great shift.</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date().toLocaleDateString("en-AU", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </motion.div>

        {/* Nav cards */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.07 } } }}
          className="space-y-3"
        >
          {navItems.map(item => (
            <motion.button
              key={item.route}
              variants={fadeInUp}
              onClick={() => router.push(item.route)}
              className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-5 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors text-left shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{item.label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{item.description}</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-300 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </motion.button>
          ))}
        </motion.div>

        <motion.div {...fadeInUp} className="mt-10 mb-2 px-4 text-center space-y-1">
          <p className="text-[11px] leading-relaxed text-gray-400">
            © 2026 Hamad Medical Corporation Ambulance Service - Special Operations Service. All rights reserved.
          </p>
          <p className="text-[11px] leading-relaxed text-gray-400">
            Developed and maintained by SOS Business Intelligence.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
