"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Terms of Use acknowledgment, shared by SEC, IMS and SAC (same file in each app — keep them identical).
// Shown once per user per TERMS_VERSION, in whichever app they open first; acknowledging covers all three.
// Change TERMS_VERSION (in all three apps) to ask everyone again.

export const TERMS_VERSION = "2026-10-26";
const TERMS_LABEL = "Version 26 Oct 2026 · Beta";
const CONTACT = "JSOCCBI@hamad-sos.com";
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/privacy"];

const TERMS: { title: string; text: React.ReactNode }[] = [
  { title: "Privacy", text: <>I have read the <Link href="/privacy" className="font-semibold underline" target="_blank">Privacy Notice</Link> and understand that my name, work email and the records I create are used for SOS equipment, inventory and planning purposes.</> },
  { title: "No patient information", text: "I will not enter patient names, ID numbers or medical details in any field, including comments and notes." },
  { title: "My account", text: "I will not share my account or password, and I will sign out on shared devices." },
  { title: "Accurate records", text: "What I record reflects what I actually checked or did. Changes are logged with my name and time." },
  { title: "Confidentiality", text: "I will not copy, screenshot or share app information outside SOS work." },
  { title: "Problems", text: <>I will report suspected misuse, a lost device or a security issue to <a href={`mailto:${CONTACT}`} className="font-semibold underline">{CONTACT}</a> straight away.</> },
];

export default function TermsGate({ app }: { app: "SEC" | "IMS" | "SAC" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [needed, setNeeded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isPublic = pathname === "/" || PUBLIC_PATHS.some(p => pathname.startsWith(p));

  useEffect(() => {
    if (isPublic) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      const { data, error: err } = await supabase
        .from("terms_acknowledgments")
        .select("version")
        .eq("user_id", session.user.id)
        .eq("version", TERMS_VERSION)
        .maybeSingle();
      if (cancelled || err) return; // never lock people out because of a network / read error
      setUserId(session.user.id);
      setNeeded(!data);
    })();
    return () => { cancelled = true; };
  }, [isPublic, pathname]);

  async function acknowledge() {
    if (!userId) return;
    setSaving(true);
    setError("");
    const { error: err } = await supabase.from("terms_acknowledgments").insert({ user_id: userId, version: TERMS_VERSION, app });
    setSaving(false);
    if (err && err.code !== "23505") { setError("Could not save — please try again. (" + err.message + ")"); return; }
    setNeeded(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (isPublic || !needed) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-xl">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">SOS Apps — Terms of Use</h2>
          <p className="text-xs text-gray-400 mt-0.5">{TERMS_LABEL}</p>
        </div>
        <p className="text-sm text-gray-700">These apps are for SOS operational use by HMC staff. Before you continue, please confirm:</p>
        <ol className="space-y-2.5">
          {TERMS.map((t, i) => (
            <li key={t.title} className="flex gap-3 text-sm text-gray-700 leading-relaxed">
              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <span><b className="text-gray-900">{t.title}.</b> {t.text}</span>
            </li>
          ))}
        </ol>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={signOut} disabled={saving}
            className="flex-1 bg-gray-100 text-gray-700 text-sm font-semibold px-4 py-3 rounded-xl hover:bg-gray-200 transition-colors">
            Sign out
          </button>
          <button onClick={acknowledge} disabled={saving}
            className="flex-[2] bg-black text-white text-sm font-bold px-4 py-3 rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
            {saving ? "Saving…" : "I acknowledge"}
          </button>
        </div>
      </div>
    </div>
  );
}
