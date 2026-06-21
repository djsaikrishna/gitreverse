import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  void req;
  return NextResponse.json(
    {
      error: "single_plan_only",
      message: "Plan changes are disabled because GitReverse now has one paid plan.",
    },
    { status: 410 }
  );
}
