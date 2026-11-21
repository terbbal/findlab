"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ALLOWED_DOMAIN, supabase } from "@/lib/supabase";
import { ME_CHANGED, readDB, replaceMeDB, setWorkspace } from "@/lib/localdb";

type SyncState = "off" | "syncing" | "synced" | "error";
type AuthCtx = {
  enabled: boolean;
  session: Session | null;
  email: string | null;
  sync: SyncState;
  lastSynced: string | null;
  sendLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteCloudData: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);
export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside <AuthProvider>");
  return c;
};

/**
 * Supabase magic-link auth + cloud sync of the "me" workspace.
 * Signed out: everything stays in this browser (guest mode). Signed in: one row per student
 * in `user_data` (row-level security), pulled on sign-in and pushed (debounced) on every change.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const sb = supabase();
  const [session, setSession] = useState<Session | null>(null);
  const [sync, setSync] = useState<SyncState>("off");
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const pulledFor = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  const push = useCallback(async () => {
    if (!sb || !session) return;
    setSync("syncing");
    const { error } = await sb.from("user_data").upsert({ user_id: session.user.id, data: readDB("me"), updated_at: new Date().toISOString() });
    if (error) {
      console.warn("[sync] push failed:", error.message);
      setSync("error");
    } else {
      setSync("synced");
      setLastSynced(new Date().toISOString());
    }
  }, [sb, session]);

  // On sign-in: pull the cloud copy (or upload this browser's data the first time).
  useEffect(() => {
    if (!sb || !session || pulledFor.current === session.user.id) return;
    pulledFor.current = session.user.id;
    (async () => {
      setSync("syncing");
      const { data, error } = await sb.from("user_data").select("data, updated_at").eq("user_id", session.user.id).maybeSingle();
      if (error) {
        console.warn("[sync] pull failed:", error.message);
        setSync("error");
        return;
      }
      if (data?.data && Object.keys(data.data).length) {
        replaceMeDB(data.data);
        setLastSynced(data.updated_at);
        setSync("synced");
      } else {
        await push(); // first sign-in: upload what's in this browser
      }
      setWorkspace("me");
    })();
  }, [sb, session, push]);

  // Push local changes (debounced) while signed in.
  useEffect(() => {
    if (!session) return;
    const onChange = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(push, 1200);
    };
    window.addEventListener(ME_CHANGED, onChange);
    return () => window.removeEventListener(ME_CHANGED, onChange);
  }, [session, push]);

  const sendLink = useCallback(
    async (email: string) => {
      if (!sb) throw new Error("Sign-in isn't configured on this server.");
      const e = email.trim().toLowerCase();
      if (ALLOWED_DOMAIN && !e.endsWith(`@${ALLOWED_DOMAIN}`)) throw new Error(`Please use your @${ALLOWED_DOMAIN} email.`);
      const { error } = await sb.auth.signInWithOtp({ email: e, options: { emailRedirectTo: `${window.location.origin}/account` } });
      if (error) throw new Error(error.message);
    },
    [sb],
  );

  const signOut = useCallback(async () => {
    await sb?.auth.signOut();
    pulledFor.current = null;
    setSync("off");
  }, [sb]);

  const deleteCloudData = useCallback(async () => {
    if (!sb || !session) return;
    const { error } = await sb.from("user_data").delete().eq("user_id", session.user.id);
    if (error) throw new Error(error.message);
    setLastSynced(null);
  }, [sb, session]);

  return (
    <Ctx.Provider value={{ enabled: Boolean(sb), session, email: session?.user.email ?? null, sync, lastSynced, sendLink, signOut, deleteCloudData }}>
      {children}
    </Ctx.Provider>
  );
}
