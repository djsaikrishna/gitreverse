/**
 * One-time backfill: stripe.customers.metadata.supabase_user_id for active subs.
 * Run from repo root: node --env-file=.env.local scripts/backfill-premium-user-ids.mjs
 */

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_SECRET_KEY?.trim();

if (!stripeKey || !supabaseUrl || !serviceKey) {
  console.error(
    "Missing STRIPE_SECRET_KEY, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const stripe = new Stripe(stripeKey, { apiVersion: "2025-02-24.acacia" });
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Login email ≠ payer email */
const MANUAL_LINKS = [
  {
    customerId: "cus_UW6WihNprhk6T2",
    userId: "679474a6-be89-43dc-b4f0-7a19b04f0e70",
  },
];

async function linkCustomer(customerId, userId) {
  await stripe.customers.update(customerId, {
    metadata: { supabase_user_id: userId },
  });
  console.log(`Linked ${customerId} -> ${userId}`);
}

async function main() {
  const emailToUserId = new Map();
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    for (const u of data.users) {
      const email = u.email?.trim().toLowerCase();
      if (email) emailToUserId.set(email, u.id);
    }
    if (data.users.length < 1000) break;
    page += 1;
  }

  for (const link of MANUAL_LINKS) {
    await linkCustomer(link.customerId, link.userId);
  }

  const manualCustomerIds = new Set(MANUAL_LINKS.map((l) => l.customerId));

  const subs = await stripe.subscriptions.list({
    status: "active",
    limit: 100,
  });

  const seenCustomers = new Set();
  for (const sub of subs.data) {
    const customerId =
      typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    if (seenCustomers.has(customerId)) continue;
    if (manualCustomerIds.has(customerId)) continue;
    seenCustomers.add(customerId);

    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) continue;
    if (customer.metadata?.supabase_user_id?.trim()) {
      console.log(`Skip ${customerId} (already linked)`);
      continue;
    }

    const email = customer.email?.trim().toLowerCase();
    const userId = email ? emailToUserId.get(email) : undefined;
    if (!userId) {
      console.warn(`No auth user for ${customerId} (${email ?? "no email"})`);
      continue;
    }
    await linkCustomer(customerId, userId);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
