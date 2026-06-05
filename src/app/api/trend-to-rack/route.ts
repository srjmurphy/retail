import { NextResponse } from "next/server";
import { runTrendToRackCopilot } from "@/lib/trend-to-rack/copilot";
import type { DemandRecord } from "@/types/demo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prompt?: string;
      threshold?: number;
      demandRecords?: DemandRecord[];
    };

    const result = await runTrendToRackCopilot({
      prompt:
        body.prompt ||
        "What demand are we missing before this weekend, and what should RetailNext move, promote, or brief?",
      threshold: typeof body.threshold === "number" ? body.threshold : 65,
      demandRecords: Array.isArray(body.demandRecords) ? body.demandRecords : [],
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Trend-to-Rack route failed", error);
    return NextResponse.json(
      {
        error: "Trend-to-Rack analysis failed.",
      },
      { status: 500 },
    );
  }
}
