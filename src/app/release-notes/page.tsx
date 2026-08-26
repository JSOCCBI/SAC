"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, Plus, Eye, EyeOff, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AppType = "sec" | "ims";

type ReleaseNote = {
  id: string;
  app: AppType;
  version: string;
  notes: string[];
  active: boolean;
  created_at: string;
};

const APP_LABELS: Record<AppType, { label: string; badge: string }> = {
  sec: { label: "SOS Equipment Checks", badge: "bg-gray-100 text-gray-700" },
  ims: { label: "SOS Inventory Management", badge: "bg-gray-900 text-white" },
};

const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
};

export default function ReleaseNotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<ReleaseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | AppType>("all");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form state
  const [formApp, setFormApp] = useState<AppType>("sec");
  const [formVersion, setFormVersion] = useState("");
  const [formBullets, setFormBullets] = useState(["", "", ""]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    const { data, error } = await supabase
      .from("release_notes")
      .select("id, app, version, notes, active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      showToast("Failed to load release notes.", "error");
    } else {
      setNotes((data as ReleaseNote[]) || []);
    }
    setLoading(false);
  }

  async function toggleActive(note: ReleaseNote) {
    setUpdating(note.id);
    const { error } = await supabase
      .from("release_notes")
      .update({ active: !note.active })
      .eq("id", note.id);

    if (error) {
      showToast("Failed to update note.", "error");
    } else {
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, active: !n.active } : n));
      showToast(`Note ${!note.active ? "published" : "hidden"}.`, "success");
    }
    setUpdating(null);
  }

  async function deleteNote(note: ReleaseNote) {
    if (!confirm(`Delete ${note.app.toUpperCase()} v${note.version}? This cannot be undone.`)) return;
    setUpdating(note.id + "_del");
    const { error } = await supabase.from("release_notes").delete().eq("id", note.id);

    if (error) {
      showToast("Failed to delete note.", "error");
    } else {
      setNotes(prev => prev.filter(n => n.id !== note.id));
      showToast("Release note deleted.", "success");
    }
    setUpdating(null);
  }

  async function handleSubmit() {
    const bullets = formBullets.map(b => b.trim()).filter(Boolean);
    if (!formVersion.trim()) { showToast("Version is required.", "error"); return; }
    if (bullets.length === 0) { showToast("Add at least one note.", "error"); return; }

    setSubmitting(true);
    const { data, error } = await supabase
      .from("release_notes")
      .insert({ app: formApp, version: formVersion.trim(), notes: bullets, active: true })
      .select()
      .single();

    if (error) {
      showToast("Failed to publish note.", "error");
    } else {
      setNotes(prev => [data as ReleaseNote, ...prev]);
      showToast(`${formApp.toUpperCase()} v${formVersion.trim()} published!`, "success");
      setShowForm(false);
      setFormVersion("");
      setFormBullets(["", "", ""]);
    }
    setSubmitting(false);
  }

  function addBullet() {
    setFormBullets(prev => [...prev, ""]);
  }

  function updateBullet(i: number, val: string) {
    setFormBullets(prev => prev.map((b, idx) => idx === i ? val : b));
  }

  function removeBullet(i: number) {
    setFormBullets(prev => prev.filter((_, idx) => idx !== i));
  }

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  const filtered = filter === "all" ? notes : notes.filter(n => n.app === filter);

  const filterTabs: { key: "all" | AppType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "sec", label: "SEC" },
    { key: "ims", label: "IMS" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="fixed inset-0 -z-10 sac-grid-bg pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-100" style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)" }}>
        <div className="max-w-4xl mx-auto px-4 flex justify-between items-center h-14">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-black text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Note
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Title */}
        <motion.div {...fadeInUp} className="mb-6">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.5px]">App Management</p>
          <h1 className="text-2xl font-light text-gray-900 tracking-tight mt-1">
            Release <span className="font-extrabold">Notes</span>
          </h1>
        </motion.div>

        {/* Filter tabs */}
        <motion.div {...fadeInUp} transition={{ delay: 0.04, ...fadeInUp.transition }} className="flex rounded-xl overflow-hidden border border-gray-200 bg-white text-sm w-fit mb-5">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 font-medium transition-colors ${filter === tab.key ? "bg-black text-white" : "text-gray-500 hover:text-gray-700"}`}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Notes list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div {...fadeInUp} className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
            <p className="text-gray-400 text-sm">No release notes yet. Tap <strong>New Note</strong> to publish one.</p>
          </motion.div>
        ) : (
          <motion.div
            initial="initial"
            animate="animate"
            variants={{ animate: { transition: { staggerChildren: 0.04 } } }}
            className="space-y-3"
          >
            {filtered.map(note => (
              <motion.div
                key={note.id}
                variants={fadeInUp}
                className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${note.active ? "border-gray-100" : "border-gray-100 opacity-50"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${APP_LABELS[note.app].badge}`}>
                        {note.app.toUpperCase()}
                      </span>
                      <span className="text-sm font-extrabold text-gray-900">v{note.version}</span>
                      {note.active ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-lg">Live</span>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded-lg">Hidden</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mb-3">
                      {new Date(note.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <ul className="space-y-1">
                      {note.notes.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0 mt-1.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => toggleActive(note)}
                      disabled={updating === note.id}
                      title={note.active ? "Hide" : "Publish"}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100 text-gray-400 hover:text-gray-700 disabled:opacity-40"
                    >
                      {updating === note.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : note.active
                        ? <EyeOff className="w-4 h-4" />
                        : <Eye className="w-4 h-4" />
                      }
                    </button>
                    <button
                      onClick={() => deleteNote(note)}
                      disabled={updating === note.id + "_del"}
                      title="Delete"
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-40"
                    >
                      {updating === note.id + "_del"
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />
                      }
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* New Note Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="relative w-full max-w-md bg-white rounded-3xl px-6 pt-6 pb-7 z-10 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold text-gray-900">New Release Note</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* App picker */}
              <div className="mb-4">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.5px] block mb-2">App</label>
                <div className="flex gap-2">
                  {(["sec", "ims"] as AppType[]).map(app => (
                    <button
                      key={app}
                      onClick={() => setFormApp(app)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors border ${
                        formApp === app
                          ? "bg-black text-white border-black"
                          : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {app.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Version */}
              <div className="mb-4">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.5px] block mb-2">Version</label>
                <input
                  type="text"
                  value={formVersion}
                  onChange={e => setFormVersion(e.target.value)}
                  placeholder="e.g. 1.5.0"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors"
                />
              </div>

              {/* Bullet points */}
              <div className="mb-5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.5px] block mb-2">What&apos;s new</label>
                <div className="space-y-2">
                  {formBullets.map((bullet, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                      <input
                        type="text"
                        value={bullet}
                        onChange={e => updateBullet(i, e.target.value)}
                        placeholder={`Point ${i + 1}`}
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors"
                      />
                      {formBullets.length > 1 && (
                        <button
                          onClick={() => removeBullet(i)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addBullet}
                  className="mt-2 text-xs font-medium text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add point
                </button>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-black text-white font-bold py-3 rounded-2xl hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publish"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
