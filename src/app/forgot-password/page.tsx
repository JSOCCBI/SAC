"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

const fadeInUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };
const stagger = { animate: { transition: { staggerChildren: 0.07 } } };

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.toLowerCase().endsWith("@hamad.qa")) {
      setError("Only @hamad.qa email addresses are allowed.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="fixed inset-0 -z-10 sac-grid-bg pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm text-center"
        >
          <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-50 mb-4">
              <CheckCircle2 className="w-7 h-7 text-green-500" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">Check your email</h2>
            <p className="text-sm text-gray-500 mb-1">
              We sent a password reset link to
            </p>
            <p className="text-sm font-semibold text-gray-800 mb-6">{email}</p>
            <Link
              href="/login"
              className="w-full inline-block bg-black text-white font-bold text-sm rounded-xl py-3 hover:bg-gray-800 transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="fixed inset-0 -z-10 sac-grid-bg pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial="initial"
          animate="animate"
          variants={stagger}
          className="w-full max-w-sm"
        >
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
          </motion.div>

          {/* Card */}
          <motion.div variants={fadeInUp} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.5px] mb-1">Reset your password</p>
            <p className="text-xs text-gray-500 mb-5">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@hamad.qa"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-red-600 font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white font-bold text-sm rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-60"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : "Send Reset Link"}
              </button>
            </form>
          </motion.div>

          {/* Back to login */}
          <motion.p variants={fadeInUp} className="text-center text-xs text-gray-400 mt-5">
            <Link href="/login" className="inline-flex items-center gap-1 font-bold text-gray-700 hover:underline">
              <ArrowLeft className="w-3 h-3" /> Back to Sign In
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
