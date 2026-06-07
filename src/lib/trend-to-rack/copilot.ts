import type { TrendToRackResult, TrendToolTrace } from "@/types/demo";
import { hasOpenAIKey, getOpenAIClient } from "@/lib/openai/client";
import { TEXT_MODEL } from "@/lib/openai/models";
import { withTimeout } from "@/lib/openai/timeout";
import { combineDemandRecords } from "@/lib/demand-log/summarize";
import type { TrendInput, TrendToolName } from "./types";
import { runTrendTools } from "./tools";

const toolNames: TrendToolName[] = [
  "analyze_customer_intents",
  "inspect_inventory_gaps",
  "summarize_substitution_trends",
  "inspect_store_location_failures",
  "compare_competitor_signal",
  "recommend_business_actions",
];

function outputFor<T>(trace: TrendToolTrace[], name: string) {
  return trace.find((item) => item.name === name)?.output as T;
}

function deterministicResult({
  traces,
  prompt,
  fallbackUsed = false,
}: {
  traces: TrendToolTrace[];
  prompt: string;
  fallbackUsed?: boolean;
}): TrendToRackResult {
  const intents = outputFor<{
    totalSignals: number;
    highQualitySignals: number;
    missedSearches: number;
    emergingIntents: string[];
    missedRevenue: number;
  }>(traces, "analyze_customer_intents");
  const gaps = outputFor<{
    categorySizeColourRisks: string[];
    estimatedMissedRevenue: number;
  }>(traces, "inspect_inventory_gaps");
  const substitutions = outputFor<{
    substitutionPatterns: string[];
  }>(traces, "summarize_substitution_trends");
  const findability = outputFor<{
    findabilityIssueCount: number;
    spreadAcrossDepartments: string[];
    recommendedStoreOpsNeed: string;
  }>(traces, "inspect_store_location_failures");
  const competitor = outputFor<{
    label: string;
    signal: string;
    source: string;
  }>(traces, "compare_competitor_signal");
  const actions = outputFor<{
    recommendedBuySignals: TrendToRackResult["buySignals"];
    allSignals: TrendToRackResult["buySignals"];
    recommendedActions: string[];
  }>(traces, "recommend_business_actions");

  const missedRevenue = gaps.estimatedMissedRevenue || intents.missedRevenue;
  const rankedMisses = [...actions.allSignals]
    .filter((signal) => signal.evidenceCount > 0)
    .sort(
      (left, right) =>
        right.estimatedMissedRevenue - left.estimatedMissedRevenue ||
        right.confidenceScore - left.confidenceScore,
    );
  const biggestMiss = rankedMisses[0];
  const asksForBiggestMiss = /\b(biggest|largest|top|greatest|most important)\b.*\b(miss|gap|loss|opportunity)\b/i.test(
    prompt,
  );
  const nextMove = biggestMiss
    ? asksForBiggestMiss
      ? `${biggestMiss.demandPattern}: ${biggestMiss.recommendedAction}`
      : biggestMiss.recommendedAction
    : "Monitor new customer searches until a demand gap crosses the evidence threshold.";

  return {
    mode: fallbackUsed ? "demo" : "demo",
    fallbackUsed,
    fallbackMessage: fallbackUsed ? "Live AI unavailable — showing simulated result." : null,
    executiveBrief: biggestMiss
      ? `${biggestMiss.demandPattern} is the largest grounded miss at $${biggestMiss.estimatedMissedRevenue}, based on ${biggestMiss.evidenceCount} customer signal(s).`
      : `${intents.totalSignals} demand signal(s) were analysed with no material missed-revenue gap.`,
    nextMove,
    buySignals: actions.recommendedBuySignals,
    demandSignals: intents.emergingIntents,
    inventoryGaps: gaps.categorySizeColourRisks,
    findabilityGaps: [
      `${findability.findabilityIssueCount} findability issue signal(s) detected`,
      ...findability.spreadAcrossDepartments.slice(0, 4),
      findability.recommendedStoreOpsNeed,
    ],
    recommendedActions: actions.recommendedActions,
    evidencePanel: [
      `${intents.highQualitySignals} high-quality customer search/intent signals`,
      `${intents.missedSearches} misses or partial misses`,
      ...substitutions.substitutionPatterns,
      competitor.signal,
      competitor.source,
    ],
    businessImpact: [
      "Protect high-intent conversion before weekend events.",
      "Reduce poor reviews caused by available-but-hard-to-find products.",
      "Increase full-look basket size by connecting apparel, shoes and accessories.",
      "Improve associate readiness with exact route and substitution guidance.",
      "Improve stock allocation using demand signals before competitors capture the trend.",
    ],
    trace: traces,
  };
}

async function callForcedTool(name: TrendToolName, input: TrendInput) {
  const client = getOpenAIClient();

  // Production seam: this is where the real OpenAI tool call happens.
  const response = await withTimeout(
    client.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: "system",
          content: `Call ${name}. The local application will execute the tool over deterministic mock data.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            prompt: input.prompt,
            threshold: input.threshold,
            demandRecordCount: input.demandRecords.length,
          }),
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name,
            description: `Maven intelligence tool: ${name}`,
            parameters: {
              type: "object",
              properties: {
                threshold: { type: "number" },
                recordCount: { type: "number" },
              },
            },
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: { name },
      },
    }),
  );

  if (!response.choices[0]?.message?.tool_calls?.[0]) {
    throw new Error(`OpenAI did not call ${name}`);
  }
}

async function synthesizeLiveBrief(traces: TrendToolTrace[], prompt: string) {
  const client = getOpenAIClient();

  // Production seam: this is where the real OpenAI call happens.
  const response = await withTimeout(
    client.chat.completions.create({
      model: TEXT_MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write concise executive retail actions grounded only in supplied tool outputs. Answer the executiveQuestion directly. If it asks for the biggest miss, rank by estimatedMissedRevenue and do not double-count overlapping signals or prioritize confidence over revenue. Return JSON with executiveBrief and nextMove. nextMove must be one sentence under 24 words. executiveBrief must be no more than two short sentences.",
        },
        {
          role: "user",
          content: JSON.stringify({
            executiveQuestion: prompt,
            toolOutputs: traces,
          }),
        },
      ],
    }),
  );

  return JSON.parse(response.choices[0]?.message?.content ?? "{}") as {
    executiveBrief?: string;
    nextMove?: string;
  };
}

export async function runTrendToRackCopilot(input: TrendInput): Promise<TrendToRackResult> {
  const records = combineDemandRecords(input.demandRecords);
  if (!records.length) {
    return {
      mode: input.mode,
      fallbackUsed: false,
      fallbackMessage: null,
      executiveBrief: "No customer evidence is available yet.",
      nextMove: "Launch a Style story before asking Maven for a growth plan.",
      buySignals: [],
      demandSignals: [],
      inventoryGaps: [],
      findabilityGaps: [],
      recommendedActions: [],
      evidencePanel: [],
      businessImpact: [],
      trace: [],
    };
  }
  const traces = runTrendTools(records, input.threshold);

  if (input.mode === "demo") {
    return deterministicResult({ traces, prompt: input.prompt });
  }

  if (!hasOpenAIKey()) {
    return deterministicResult({ traces, prompt: input.prompt, fallbackUsed: true });
  }

  try {
    for (const name of toolNames) {
      await callForcedTool(name, input);
    }

    const liveBrief = await synthesizeLiveBrief(traces, input.prompt);
    const deterministic = deterministicResult({ traces, prompt: input.prompt });

    return {
      ...deterministic,
      mode: "live",
      executiveBrief: liveBrief.executiveBrief || deterministic.executiveBrief,
      nextMove: deterministic.nextMove,
    };
  } catch (error) {
    console.error("Live Maven analysis failed", error);
    return deterministicResult({ traces, prompt: input.prompt, fallbackUsed: true });
  }
}
