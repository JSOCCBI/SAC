"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, Loader2, CheckCircle2, Code2, Sun, Moon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/components/ThemeProvider";

const fadeInUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };
const stagger = { animate: { transition: { staggerChildren: 0.06 } } };

export default function SettingsPage() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      const { data } = await supabase
        .from("user_profiles")
        .select("first_name, last_name, middle_name")
        .eq("id", session.user.id)
        .single();

      if (data) {
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setMiddleName(data.middle_name || "");
      }
      setLoading(false);
    };
    load();
  }, [router]);

  const handleSave = async () => {
    setError("");
    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        middle_name: middleName.trim() || null,
        full_name: `${firstName.trim()} ${lastName.trim()}`,
      })
      .eq("id", session.user.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

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
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <motion.div initial="initial" animate="animate" variants={stagger}>

          {/* Title */}
          <motion.div variants={fadeInUp} className="mb-6">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.5px]">Account</p>
            <h1 className="text-2xl font-light text-gray-900 tracking-tight mt-1">
              <span className="font-extrabold">Settings</span>
            </h1>
          </motion.div>

          {/* About card */}
          <motion.div variants={fadeInUp} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-5">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.5px] mb-4">About</p>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-extrabold text-gray-900 tracking-tight">SOS Access</p>
                <p className="text-xs text-gray-400">Version 1.2.0{process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ? ` · build ${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 7)}` : ""}</p>
              </div>
            </div>
            <div className="space-y-3 border-t border-gray-100 pt-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-400">Created by</p>
                <p className="text-xs font-semibold text-gray-700">Rey Ian Cabanganan</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-400">Maintained by</p>
                <p className="text-xs font-semibold text-gray-700">Business Intelligence</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-400">Organisation</p>
                <p className="text-xs font-semibold text-gray-700">Special Operations Service</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-400">Support</p>
                <p className="text-xs font-semibold text-gray-700">rcabanganan@hamad.qa</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-400">Last updated</p>
                <p className="text-xs font-semibold text-gray-700">October 2026</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-400">Environment</p>
                <p className="text-xs font-semibold text-green-600">Production</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-1.5">
              <Code2 className="w-3 h-3 text-gray-300" />
              <p className="text-[10px] text-gray-300">Built with Next.js · Supabase · Tailwind CSS</p>
            </div>
          </motion.div>

          {/* Appearance card */}
          <motion.div variants={fadeInUp} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-5">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.5px] mb-4">Appearance</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === "dark"
                  ? <Moon className="w-5 h-5 text-gray-500" />
                  : <Sun className="w-5 h-5 text-gray-500" />
                }
                <div>
                  <p className="text-sm font-bold text-gray-900">{theme === "dark" ? "Night Mode" : "Day Mode"}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Tap to switch theme</p>
                </div>
              </div>
              <button
                onClick={toggle}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${theme === "dark" ? "bg-indigo-600" : "bg-gray-200"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${theme === "dark" ? "translate-x-6" : "translate-x-0"}`} />
              </button>
            </div>
          </motion.div>

          {/* Name card */}
          <motion.div variants={fadeInUp} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.5px] mb-4">Your Name</p>
            <p className="text-xs text-gray-400 mb-4">
              This is how your name appears across the system.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Cabanganan"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Rey Ian"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Middle Name <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={middleName}
                  onChange={e => setMiddleName(e.target.value)}
                  placeholder="Tomedo"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-red-600 font-medium">{error}</p>
                </div>
              )}

              {saved && (
                <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <p className="text-xs text-green-600 font-medium">Name updated successfully.</p>
                </div>
              )}
            </div>
          </motion.div>
          {/* Copyright */}
          <motion.div variants={fadeInUp} className="mt-8 mb-2 px-4 text-center space-y-1">
            <p className="text-[11px] leading-relaxed text-gray-400">
              © 2026 Hamad Medical Corporation Ambulance Service - Special Operations Service. All rights reserved.
            </p>
            <p className="text-[11px] leading-relaxed text-gray-400">
              Developed and maintained by Rey Ian Cabanganan, Business Intelligence.
            </p>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-100 bg-white px-4 py-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        <div className="max-w-4xl mx-auto flex gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center justify-center gap-1.5 px-5 py-4 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-black text-white font-bold text-sm rounded-2xl py-4 flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
