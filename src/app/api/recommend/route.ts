import { NextResponse } from "next/server";
import { runRecommendationPipeline } from "@/lib/recommend/pipeline";
import type { InputMode, RecommendationWorkflowId, RunMode } from "@/types/demo";
import { appendDemandRecord } from "@/lib/demand-log/store";
import { validateImageDataUrl } from "@/lib/recommend/image-validation";

export const runtime = "nodejs";

/*
 * VIDEO ANCHOR: API ENTRY
 * - One server-side endpoint accepts both text and photo requests.
 * - Uploads are validated before reaching any model or retrieval code.
 * - Live and deterministic modes share the same typed recommendation pipeline.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      mode?: RunMode;
      inputMode?: InputMode;
      query?: string;
      selectedSampleId?: string;
      imageDataUrl?: string;
      workflowId?: RecommendationWorkflowId;
      sessionId?: string;
    };
    validateImageDataUrl(body.imageDataUrl);

    const inputMode = body.inputMode === "photo" ? "photo" : "text";
    const result = await runRecommendationPipeline({
      mode: body.mode === "live" ? "live" : "demo",
      inputMode,
      query:
        inputMode === "photo"
          ? body.query?.trim() ?? ""
          : body.query?.trim() ||
            "I need a navy outfit for an outdoor wedding next weekend, men's, size 42, under $400.",
      selectedSampleId: body.selectedSampleId,
      imageDataUrl: body.imageDataUrl,
      workflowId: body.workflowId,
    });
    if (body.sessionId?.trim()) {
      appendDemandRecord(body.sessionId.trim(), result.demandRecord);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Recommendation route failed", error);
    const message = error instanceof Error ? error.message : "Recommendation failed.";
    return NextResponse.json(
      {
        error: message,
      },
      { status: message.includes("image") || message.includes("Upload") ? 400 : 500 },
    );
  }
}
