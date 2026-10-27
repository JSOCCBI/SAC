"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Megaphone, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "sac_dismissed_broadcasts";
const SEEN_KEY = "sac_seen_broadcasts";

interface Broadcast {
  id: string;
  message: string;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
}

function readIds(key: string): string[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function writeIds(key: string, ids: string[]) {
  try { localStorage.setItem(key, JSON.stringify(ids)); } catch { /* ignore */ }
}

function expiryLabel(expiresAt: string | null) {
  if (!expiresAt) return "";
  const expiry = new Date(expiresAt);
  const diffMins = Math.floor((expiry.getTime() - Date.now()) / 60000);
  if (diffMins < 60) return `Expires in ${diffMins}m`;
  if (diffMins < 1440) return `Expires in ${Math.floor(diffMins / 60)}h`;
  return `Expires ${expiry.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

function senderName(createdBy: string | null) {
  return createdBy ? createdBy.split("@")[0] : null;
}

function BroadcastBar({ broadcast, onOpen, onDismiss }: { broadcast: Broadcast; onOpen: () => void; onDismiss: () => void }) {
  return (
    <div className="w-full bg-amber-400 flex items-center border-b border-amber-500/40">
      <button
        onClick={onOpen}
        className="flex-1 min-w-0 flex items-center gap-2.5 pl-4 pr-2 py-2.5 text-left active:bg-amber-500 transition-colors"
        aria-label="Read broadcast"
      >
        <Megaphone className="w-4 h-4 text-amber-900 shrink-0" />
        <p className="flex-1 min-w-0 truncate text-sm font-semibold text-amber-900">{broadcast.message}</p>
        <span className="shrink-0 flex items-center text-[11px] font-medium text-amber-800">
          Tap to read <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </button>
      <button
        onClick={onDismiss}
        className="p-2 mr-2 rounded-lg hover:bg-amber-500 transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5 text-amber-900" />
      </button>
    </div>
  );
}

function BroadcastModal({ broadcast, onClose }: { broadcast: Broadcast; onClose: () => void }) {
  const sender = senderName(broadcast.created_by);
  const sent = new Date(broadcast.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const expiry = expiryLabel(broadcast.expires_at);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4"
      style={{ paddingTop: "calc(1rem + env(safe-area-inset-top))", paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl flex flex-col max-h-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5 text-amber-900" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-gray-900">Broadcast</p>
            <p className="text-xs text-gray-500 truncate">
              {sender ? `${sender} · ` : ""}{sent}{expiry ? ` · ${expiry}` : ""}
            </p>
          </div>
        </div>
        <div className="px-5 py-4 overflow-y-auto overscroll-contain">
          <p className="text-[15px] text-gray-800 leading-relaxed whitespace-pre-wrap break-words">{broadcast.message}</p>
        </div>
        <div className="px-5 pt-2 pb-5">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-900 font-semibold text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BroadcastBanner() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  async function fetchActive() {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("broadcasts")
      .select("id, message, created_by, created_at, expires_at")
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("created_at", { ascending: false })
      .limit(2);
    const list: Broadcast[] = data ?? [];
    setBroadcasts(list);
    setDismissedIds(readIds(STORAGE_KEY));

    // Open a new broadcast automatically the first time it's seen on this device
    const dismissed = readIds(STORAGE_KEY);
    const seen = readIds(SEEN_KEY);
    const unseen = list.find(b => !dismissed.includes(b.id) && !seen.includes(b.id));
    if (unseen) {
      writeIds(SEEN_KEY, [...seen, unseen.id].slice(-50));
      setOpenId(cur => cur ?? unseen.id);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch + realtime subscription
    fetchActive();

    const channel = supabase
      .channel("broadcast-banner")
      .on("postgres_changes", { event: "*", schema: "public", table: "broadcasts" }, fetchActive)
      .subscribe();

    const interval = setInterval(fetchActive, 60_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const visible = broadcasts.filter(b => !dismissedIds.includes(b.id));

  function handleDismiss(id: string) {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    writeIds(STORAGE_KEY, updated);
  }

  const open = visible.find(b => b.id === openId) ?? null;
  if (visible.length === 0) return null;

  return (
    <div>
      {visible.map(b => (
        <BroadcastBar key={b.id} broadcast={b} onOpen={() => setOpenId(b.id)} onDismiss={() => handleDismiss(b.id)} />
      ))}
      {open && <BroadcastModal broadcast={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}
