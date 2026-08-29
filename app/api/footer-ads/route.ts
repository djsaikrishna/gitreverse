import { NextResponse } from "next/server";
import { FOOTER_PAID_SLOT_COUNT } from "@/lib/footer-ads";
import {
  countPublishedFooterAds,
  getPublishedFooterAds,
} from "@/lib/footer-ads-server";

export const runtime = "nodejs";

export async function GET() {
  const [ads, taken] = await Promise.all([
    getPublishedFooterAds(),
    countPublishedFooterAds(),
  ]);

  return NextResponse.json({
    ads,
    remaining: Math.max(0, FOOTER_PAID_SLOT_COUNT - taken),
    soldOut: taken >= FOOTER_PAID_SLOT_COUNT,
  });
}
