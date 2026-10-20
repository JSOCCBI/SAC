"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

const fadeInUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };
const stagger = { animate: { transition: { staggerChildren: 0.07 } } };

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  // One-time code from the email link (?token_hash=…). It is only spent when the form is submitted,
  // so the link works in any browser and isn't used up by Outlook's link scanner opening it first.
  const [tokenHash, setTokenHash] = useState<string | null>(null);
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const urlError = params.get("error_description") || hash.get("error_description");
    const th = params.get("token_hash");

    // Older emails: Supabase exchanges the recovery token from the URL automatically
    let timeout: ReturnType<typeof setTimeout>;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "PASSWORD_RECOVERY") {
        clearTimeout(timeout);
        setSessionReady(true);
      }
    });
    timeout = setTimeout(() => {
      if (urlError) setLinkError(urlError.replace(/\+/g, " "));
      else if (th) { setTokenHash(th); setSessionReady(true); }
      else timeout = setTimeout(() => setLinkError("This reset link is invalid or has expired."), 10000);
    }, 0);
    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    if (tokenHash) {
      const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
      if (otpError) {
        setLinkError("This reset link has already been used or has expired.");
        setLoading(false);
        return;
      }
      setTokenHash(null); // spent — a retry after an update error uses the session it created
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Sign out so they log in fresh with the new password
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    setDone(true);
    setLoading(false);
  };

  if (done) {
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
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">Password Updated</h2>
            <p className="text-sm text-gray-500 mb-6">
              Your password has been changed. You can now sign in with your new password.
            </p>
            <button
              onClick={() => router.replace("/login")}
              className="w-full bg-black text-white font-bold text-sm rounded-xl py-3 hover:bg-gray-800 transition-colors"
            >
              Go to Sign In
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (linkError) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="fixed inset-0 -z-10 sac-grid-bg pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm text-center"
        >
          <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 mb-4">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">Link Not Valid</h2>
            <p className="text-sm text-gray-500 mb-6">
              {linkError} Reset links work once and expire after an hour. Please request a new one.
            </p>
            <button
              onClick={() => router.replace("/forgot-password")}
              className="w-full bg-black text-white font-bold text-sm rounded-xl py-3 hover:bg-gray-800 transition-colors"
            >
              Request New Link
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="fixed inset-0 -z-10 sac-grid-bg pointer-events-none" />
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Verifying reset link…
        </div>
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
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.5px] mb-5">Set new password</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="Min. 6 characters"
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

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirm New Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter your password"
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
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : "Update Password"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
