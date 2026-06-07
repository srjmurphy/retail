import { NextResponse } from "next/server";
import { runMavenEvals } from "@/lib/evals/run";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const includeLive = new URL(request.url).searchParams.get("live") === "1";
  const report = await runMavenEvals(includeLive);
  return NextResponse.json(report, { status: report.passed ? 200 : 500 });
}
