import { getSupabase, getSupabaseAdmin } from "@/lib/supabase";
import {
  coerceFooterAd,
  FOOTER_PAID_SLOT_COUNT,
  type FooterAd,
} from "@/lib/footer-ads";

export async function getPublishedFooterAds(): Promise<FooterAd[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("footer_ads")
    .select("id, website, words, created_at")
    .order("created_at", { ascending: true })
    .limit(FOOTER_PAID_SLOT_COUNT);

  if (error || !data) return [];
  return data
    .map((row) => coerceFooterAd(row))
    .filter((ad): ad is FooterAd => ad !== null);
}

export async function countPublishedFooterAds(): Promise<number> {
  const admin = getSupabaseAdmin() ?? getSupabase();
  if (!admin) return 0;

  const { count, error } = await admin
    .from("footer_ads")
    .select("id", { count: "exact", head: true });

  if (error) return 0;
  return count ?? 0;
}

export async function publishFooterAd(input: {
  website: string;
  words: string;
  stripeCheckoutSessionId: string;
}): Promise<FooterAd | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: existing, error: existingError } = await admin
    .from("footer_ads")
    .select("id, website, words, created_at")
    .eq("stripe_checkout_session_id", input.stripeCheckoutSessionId)
    .maybeSingle();

  if (!existingError && existing) {
    return coerceFooterAd(existing);
  }

  const taken = await countPublishedFooterAds();
  if (taken >= FOOTER_PAID_SLOT_COUNT && !existing) {
    return null;
  }

  const { data, error } = await admin
    .from("footer_ads")
    .insert({
      website: input.website,
      words: input.words,
      stripe_checkout_session_id: input.stripeCheckoutSessionId,
    })
    .select("id, website, words, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: again } = await admin
        .from("footer_ads")
        .select("id, website, words, created_at")
        .eq("stripe_checkout_session_id", input.stripeCheckoutSessionId)
        .maybeSingle();
      return again ? coerceFooterAd(again) : null;
    }
    console.warn("[footer-ads] insert:", error.message);
    return null;
  }

  return coerceFooterAd(data);
}
