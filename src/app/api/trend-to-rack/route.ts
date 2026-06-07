import { NextResponse } from "next/server";
import { runTrendToRackCopilot } from "@/lib/trend-to-rack/copilot";
import type { DemandRecord, RunMode } from "@/types/demo";
import { getDemandRecords } from "@/lib/demand-log/store";
import { combineDemandRecords } from "@/lib/demand-log/summarize";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prompt?: string;
      threshold?: number;
      demandRecords?: DemandRecord[];
      mode?: RunMode;
      sessionId?: string;
    };
    const persistedRecords = body.sessionId?.trim() ? getDemandRecords(body.sessionId.trim()) : [];

    const result = await runTrendToRackCopilot({
      mode: body.mode === "live" ? "live" : "demo",
      prompt:
        body.prompt ||
        "What demand are we missing before this weekend, and what should we move, promote, or brief?",
      threshold: typeof body.threshold === "number" ? body.threshold : 65,
      demandRecords: combineDemandRecords([
        ...persistedRecords,
        ...(Array.isArray(body.demandRecords) ? body.demandRecords : []),
      ]),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Maven analysis route failed", error);
    return NextResponse.json(
      {
        error: "Maven analysis failed.",
      },
      { status: 500 },
    );
  }
}
