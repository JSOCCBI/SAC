"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <main className="min-h-dvh sac-grid-bg flex items-center justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        {/* Logo / brand */}
        <motion.div {...fadeInUp} transition={{ delay: 0.05, ...fadeInUp.transition }} className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">SOS Access</h1>
          <p className="text-sm text-gray-500 mt-1">Manager access only</p>
        </motion.div>

        {/* Card */}
        <motion.div
          {...fadeInUp}
          transition={{ delay: 0.1, ...fadeInUp.transition }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@hamad.qa"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-dark text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm mt-2"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </motion.div>

        <p className="text-center text-xs text-gray-400 mt-6">
          SOS Operations · Hamad Medical Corporation
        </p>
      </motion.div>
    </main>
  );
}
