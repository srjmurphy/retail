import { readFileSync } from "node:fs";
import path from "node:path";
import { hasOpenAIKey } from "@/lib/openai/client";
import { runRecommendationPipeline } from "@/lib/recommend/pipeline";
import { validateImageDataUrl } from "@/lib/recommend/image-validation";
import { runTrendToRackCopilot } from "@/lib/trend-to-rack/copilot";
import { appendDemandRecord, clearDemandRecords, getDemandRecords } from "@/lib/demand-log/store";

export type EvalResult = {
  name: string;
  passed: boolean;
  detail: string;
  skipped?: boolean;
};

function result(name: string, passed: boolean, detail: string, skipped = false): EvalResult {
  return { name, passed, detail, skipped };
}

export async function runMavenEvals(includeLive = false) {
  const results: EvalResult[] = [];

  const happy = await runRecommendationPipeline({
    mode: "demo",
    inputMode: "text",
    query: "I need a navy wedding outfit with a formal shirt, trousers, shoes and tie, men's size 42, under $400.",
    workflowId: "happy_path",
  });
  results.push(
    result(
      "Curated demo success",
      happy.recommendations.length === 4 && happy.recommendations.every((item) => item.inventoryStatus === "in_stock"),
      `${happy.recommendations.length} local recommendations`,
    ),
  );

  const distributed = await runRecommendationPipeline({
    mode: "demo",
    inputMode: "text",
    query: "I need a pink interview outfit with a dress and tailored trousers, women's size 10, under $250.",
    workflowId: "distributed_stock",
  });
  results.push(
    result(
      "Distributed inventory",
      distributed.partialMatches.some((item) => item.inventoryStatus === "nearby_store"),
      `${distributed.partialMatches.filter((item) => item.inventoryStatus === "nearby_store").length} nearby option(s)`,
    ),
  );

  const miss = await runRecommendationPipeline({
    mode: "demo",
    inputMode: "text",
    query: "I need plus-size formalwear for a winter wedding, women's size 18, under $250.",
    workflowId: "unmet_demand",
  });
  results.push(
    result(
      "Unmet demand",
      miss.recommendations.length === 0 && miss.demandRecord.estimatedLostRevenue === 250,
      `${miss.recommendations.length} exact matches; $${miss.demandRecord.estimatedLostRevenue} at risk`,
    ),
  );

  const arbitrary = await runRecommendationPipeline({
    mode: "demo",
    inputMode: "text",
    query: "I need a green waterproof coat for a women's work trip, size 14, under $300.",
  });
  results.push(
    result(
      "Dynamic freeform retrieval",
      arbitrary.trace.candidateCount > 4 && arbitrary.trace.retrievalStrategy.includes("Dynamic"),
      `${arbitrary.trace.candidateCount} dynamically retrieved candidates`,
    ),
  );

  const budget = await runRecommendationPipeline({
    mode: "demo",
    inputMode: "text",
    query: "I need a black dress for a work gala, women's size 10, under $80.",
  });
  results.push(
    result(
      "Budget guardrail",
      budget.recommendations.every((item) => item.product.price <= 80),
      `${budget.recommendations.length} accepted recommendation(s) at or below budget`,
    ),
  );

  const growth = await runTrendToRackCopilot({
    mode: "demo",
    prompt: "What is the biggest missed demand opportunity?",
    threshold: 35,
    demandRecords: [happy.demandRecord, distributed.demandRecord, miss.demandRecord, arbitrary.demandRecord],
  });
  results.push(
    result(
      "Grounded largest miss",
      growth.executiveBrief.includes("$300") && growth.nextMove.toLowerCase().includes("coat"),
      growth.executiveBrief,
    ),
  );

  let invalidImageRejected = false;
  try {
    validateImageDataUrl("data:image/gif;base64,R0lGODlhAQABAAAAACw=");
  } catch {
    invalidImageRejected = true;
  }
  results.push(result("Upload validation", invalidImageRejected, "Unsupported image type rejected"));

  const sessionId = `eval-${crypto.randomUUID()}`;
  appendDemandRecord(sessionId, miss.demandRecord);
  const persisted = getDemandRecords(sessionId);
  clearDemandRecords(sessionId);
  results.push(
    result(
      "Server-side session persistence",
      persisted.length === 1 && getDemandRecords(sessionId).length === 0,
      "Record persisted and reset cleanly",
    ),
  );

  if (includeLive && hasOpenAIKey()) {
    const liveStory = await runRecommendationPipeline({
      mode: "live",
      inputMode: "text",
      query: "I need a navy wedding outfit with a formal shirt, trousers, shoes and tie, men's size 42, under $400.",
      workflowId: "happy_path",
    });
    results.push(
      result(
        "Maven Live ignores curated candidates",
        liveStory.mode === "live" &&
          liveStory.trace.candidateCount > 4 &&
          liveStory.trace.retrievalStrategy.startsWith("Dynamic hybrid"),
        `${liveStory.trace.candidateCount} live candidates via ${liveStory.trace.models.embedding}`,
      ),
    );

    /*
     * VIDEO ANCHOR: LIVE PHOTO EVALS
     * - These tests call the actual multimodal, retrieval, guardrail and inventory path.
     * - The dress must return a verified anchor plus stocked heels and hosiery.
     * - The shirt must remain in stock and return trousers, formal shoes and a tie.
     */
    const imageBytes = readFileSync(
      path.join(process.cwd(), "public", "sample_clothes", "sample_images", "48481.jpg"),
    );
    const livePhoto = await runRecommendationPipeline({
      mode: "live",
      inputMode: "photo",
      query: "",
      selectedSampleId: "48481",
      imageDataUrl: `data:image/jpeg;base64,${imageBytes.toString("base64")}`,
    });
    const blackDressRoles = new Map(
      livePhoto.recommendations.map((recommendation) => [
        recommendation.product.id,
        recommendation.recommendationRole,
      ]),
    );
    results.push(
      result(
        "Live black-dress complete look",
        livePhoto.mode === "live" &&
          livePhoto.trace.models.intent !== "deterministic-parser" &&
          livePhoto.intent.colours.includes("black") &&
          livePhoto.intent.occasion === "style inspiration" &&
          livePhoto.intent.size === "Any" &&
          livePhoto.intent.budget === null &&
          blackDressRoles.get("48481") === "anchor" &&
          blackDressRoles.get("35788") === "complement" &&
          blackDressRoles.get("33981") === "complement",
        `${livePhoto.intent.occasion}; anchor ${blackDressRoles.get("48481")}; complements ${livePhoto.recommendations
          .filter((item) => item.recommendationRole === "complement")
          .map((item) => item.product.articleType)
          .join(", ")}`,
      ),
    );

    const shirtBytes = readFileSync(
      path.join(process.cwd(), "public", "sample_clothes", "sample_images", "27152.jpg"),
    );
    const liveShirtPhoto = await runRecommendationPipeline({
      mode: "live",
      inputMode: "photo",
      query: "",
      selectedSampleId: "27152",
      imageDataUrl: `data:image/jpeg;base64,${shirtBytes.toString("base64")}`,
    });
    const shirtRoles = new Map(
      liveShirtPhoto.recommendations.map((recommendation) => [
        recommendation.product.id,
        recommendation.recommendationRole,
      ]),
    );
    const shirtComplementTypes = new Set(
      liveShirtPhoto.recommendations
        .filter((item) => item.recommendationRole === "complement")
        .map((item) => item.product.articleType.toLowerCase()),
    );
    results.push(
      result(
        "Live blue-shirt complete look",
        liveShirtPhoto.mode === "live" &&
          shirtRoles.get("27152") === "anchor" &&
          liveShirtPhoto.recommendations.find((item) => item.product.id === "27152")?.inventoryStatus === "in_stock" &&
          shirtComplementTypes.has("trousers") &&
          shirtComplementTypes.has("formal shoes") &&
          shirtComplementTypes.has("ties"),
        `anchor ${shirtRoles.get("27152")} in ${
          liveShirtPhoto.recommendations.find((item) => item.product.id === "27152")?.inventoryStatus
        }; complements ${Array.from(shirtComplementTypes).join(", ")}`,
      ),
    );

    const liveGrowth = await runTrendToRackCopilot({
      mode: "live",
      prompt: "What is the biggest missed demand opportunity and what should we do next?",
      threshold: 35,
      demandRecords: [happy.demandRecord, distributed.demandRecord, miss.demandRecord, arbitrary.demandRecord],
    });
    results.push(
      result(
        "Live model-selected Grow tools",
        liveGrowth.mode === "live" &&
          liveGrowth.orchestration === "model_tool_loop" &&
          liveGrowth.trace.some((trace) => trace.selectedBy === "model") &&
          liveGrowth.executiveBrief.includes("$300"),
        `${liveGrowth.trace.length} tool(s); ${liveGrowth.executiveBrief}`,
      ),
    );
  } else {
    results.push(
      result(
        "Optional Maven Live evaluations",
        true,
        includeLive ? "Skipped because OPENAI_API_KEY is unavailable" : "Run with ?live=1 to execute paid API checks",
        true,
      ),
    );
  }

  return {
    passed: results.filter((item) => !item.skipped).every((item) => item.passed),
    totals: {
      passed: results.filter((item) => item.passed && !item.skipped).length,
      failed: results.filter((item) => !item.passed && !item.skipped).length,
      skipped: results.filter((item) => item.skipped).length,
    },
    results,
  };
}
