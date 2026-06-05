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
  fallbackUsed = false,
}: {
  traces: TrendToolTrace[];
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
    recommendedActions: string[];
  }>(traces, "recommend_business_actions");

  const missedRevenue = gaps.estimatedMissedRevenue || intents.missedRevenue;

  return {
    mode: fallbackUsed ? "demo" : "demo",
    fallbackUsed,
    fallbackMessage: fallbackUsed ? "Live AI unavailable — showing simulated result." : null,
    executiveBrief: `RetailNext is seeing ${intents.totalSignals} event-led demand signals, including ${intents.missedSearches} miss or partial-miss signal(s), before the weekend. The clearest gap is plus-size formalwear and ceremony accessory fulfilment, with $${missedRevenue} in estimated missed revenue grounded in demand records. The next move is to create a weekend occasionwear capsule, brief associates on exact routes, and monitor whether repeated misses cross the merchandising threshold.`,
    nextMove: "Stand up a weekend wedding and gala capsule rail at Oak Street, then brief associates on route steps and substitutions.",
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
            description: `Trend-to-Rack local tool: ${name}`,
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

async function synthesizeLiveBrief(traces: TrendToolTrace[]) {
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
            "You write executive retail action briefs grounded only in supplied tool outputs. Return JSON with executiveBrief and nextMove.",
        },
        {
          role: "user",
          content: JSON.stringify({
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
  const traces = runTrendTools(records, input.threshold);

  if (!hasOpenAIKey()) {
    return deterministicResult({ traces });
  }

  try {
    for (const name of toolNames) {
      await callForcedTool(name, input);
    }

    const liveBrief = await synthesizeLiveBrief(traces);
    const deterministic = deterministicResult({ traces });

    return {
      ...deterministic,
      mode: "live",
      executiveBrief: liveBrief.executiveBrief || deterministic.executiveBrief,
      nextMove: liveBrief.nextMove || deterministic.nextMove,
    };
  } catch (error) {
    console.error("Live Trend-to-Rack copilot failed", error);
    return deterministicResult({ traces, fallbackUsed: true });
  }
}
