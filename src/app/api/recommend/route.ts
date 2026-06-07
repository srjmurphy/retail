import { NextResponse } from "next/server";
import { runRecommendationPipeline } from "@/lib/recommend/pipeline";
import type { InputMode, RecommendationWorkflowId, RunMode } from "@/types/demo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      mode?: RunMode;
      inputMode?: InputMode;
      query?: string;
      selectedSampleId?: string;
      imageDataUrl?: string;
      workflowId?: RecommendationWorkflowId;
    };

    const result = await runRecommendationPipeline({
      mode: body.mode === "live" ? "live" : "demo",
      inputMode: body.inputMode === "photo" ? "photo" : "text",
      query:
        body.query ||
        "I need a navy outfit for an outdoor wedding next weekend, men's, size 42, under $400.",
      selectedSampleId: body.selectedSampleId,
      imageDataUrl: body.imageDataUrl,
      workflowId: body.workflowId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Recommendation route failed", error);
    return NextResponse.json(
      {
        error: "Recommendation failed.",
      },
      { status: 500 },
    );
  }
}
