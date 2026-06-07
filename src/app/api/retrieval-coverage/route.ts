import { NextResponse } from "next/server";
import { runRecommendationPipeline } from "@/lib/recommend/pipeline";

export const runtime = "nodejs";

const coverageQueries = [
  "I need a navy outfit for an outdoor wedding next weekend, men's, size 42, under $400.",
  "I need a black dress for a work gala this Friday, women’s size 10, under $300.",
  "I need smart casual clothes for a job interview tomorrow, men’s size M, under $250.",
  "I need a pink outfit for an interview next week, women's, size 6, under $200.",
  "I need a holiday party outfit, women’s size 12, under $350.",
  "I need comfortable shoes and a bag for a graduation ceremony this weekend.",
  "I need plus-size formalwear for a winter wedding this weekend, under $250.",
];

export async function GET() {
  const results = await Promise.all(
    coverageQueries.map(async (query) => {
      const response = await runRecommendationPipeline({
        mode: "demo",
        inputMode: "text",
        query,
      });
      const hit = response.recommendations.length > 0;
      const partial = !hit && response.partialMatches.length > 0;

      return {
        query,
        extractedIntent: response.intent,
        topRetrievedProductDisplayNames: response.trace.topProductDisplayNames,
        evidence: response.trace.retrievalEvidence.map((item) => ({
          productDisplayName: item.productDisplayName,
          realSampleImageExists: item.imageSource === "cookbook_sample",
          inventoryExists:
            item.inventoryStatus === "in_stock" ||
            item.inventoryStatus === "nearby_store" ||
            item.inventoryStatus === "out_of_stock",
          storeRouteExists: item.inventoryStatus === "in_stock" || item.inventoryStatus === "nearby_store",
          guardrail: item.guardrail,
          similarityScore: item.similarityScore,
        })),
        result: hit ? "hit" : partial ? "partial hit" : "miss",
      };
    }),
  );

  console.log("Maven retrieval coverage", results);

  return NextResponse.json({ results });
}
