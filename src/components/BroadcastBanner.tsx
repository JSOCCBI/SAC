"use client";

import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "sac_dismissed_broadcasts";

interface Broadcast {
  id: string;
  message: string;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
}

function BroadcastBar({ broadcast, onDismiss }: { broadcast: Broadcast; onDismiss: (id: string) => void }) {
  let expiryText = "";
  if (broadcast.expires_at) {
    const expiry = new Date(broadcast.expires_at);
    const diffMins = Math.floor((expiry.getTime() - Date.now()) / 60000);
    if (diffMins < 60) expiryText = `Expires in ${diffMins}m`;
    else if (diffMins < 1440) expiryText = `Expires in ${Math.floor(diffMins / 60)}h`;
    else expiryText = `Expires ${expiry.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
  }
  const sender = broadcast.created_by ? broadcast.created_by.split("@")[0] : null;

  return (
    <div className="w-full bg-amber-400 px-4 py-2.5 flex items-start gap-2.5">
      <Megaphone className="w-4 h-4 text-amber-900 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900 leading-snug">{broadcast.message}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {sender && <span className="text-[11px] text-amber-800">{sender}</span>}
          {expiryText && <span className="text-[11px] text-amber-700">{expiryText}</span>}
        </div>
      </div>
      <button
        onClick={() => onDismiss(broadcast.id)}
        className="p-1 rounded-lg hover:bg-amber-500 transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5 text-amber-900" />
      </button>
    </div>
  );
}

export default function BroadcastBanner() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  async function fetchActive() {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("broadcasts")
      .select("id, message, created_by, created_at, expires_at")
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("created_at", { ascending: false })
      .limit(2);
    setBroadcasts(data ?? []);
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setDismissedIds(JSON.parse(stored));
    } catch { /* ignore */ }

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

  function handleDismiss(id: string) {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  }

  const visible = broadcasts.filter(b => !dismissedIds.includes(b.id));
  if (visible.length === 0) return null;

  return (
    <div>
      {visible.map(b => <BroadcastBar key={b.id} broadcast={b} onDismiss={handleDismiss} />)}
    </div>
  );
}
