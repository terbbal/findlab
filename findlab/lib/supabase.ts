"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Allowed sign-in domain. Set NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN="" to allow any email (dev only). */
export const ALLOWED_DOMAIN = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN ?? "dgist.ac.kr";

let client: SupabaseClient | null = null;

/** Null when Supabase isn't configured — the app then runs in guest/local mode only. */
export function supabase(): SupabaseClient | null {
  if (!URL || !KEY) return null;
  if (!client) client = createClient(URL, KEY, { auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" } });
  return client;
}

export const authEnabled = () => Boolean(URL && KEY);
