"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
};
const stagger = { animate: { transition: { staggerChildren: 0.07 } } };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.endsWith("@hamad.qa")) {
      setError("Only @hamad.qa accounts are permitted.");
      return;
    }

    setLoading(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !data.session) {
      setError(authError?.message || "Login failed.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", data.session.user.id)
      .single();

    if (!profile || profile.role !== "manager") {
      await supabase.auth.signOut();
      setError("Manager access only. Contact your administrator.");
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="fixed inset-0 -z-10 sac-grid-bg pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div initial="initial" animate="animate" variants={stagger} className="w-full max-w-sm">

          {/* Logo */}
          <motion.div variants={fadeInUp} className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-black mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h1 className="text-2xl font-light text-gray-900 tracking-tight">
              SOS <span className="font-extrabold">Access</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">Manager access only</p>
          </motion.div>

          {/* Card */}
          <motion.div variants={fadeInUp} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.5px] mb-5">Sign in to your account</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@hamad.qa"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-600">Password</label>
                  <Link href="/forgot-password" className="text-xs text-gray-700 font-semibold hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-red-600 font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white font-bold text-sm rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : "Sign In"}
              </button>
            </form>
          </motion.div>

          <motion.p variants={fadeInUp} className="text-center text-xs text-gray-400 mt-6">
            SOS Operations · Hamad Medical Corporation
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
