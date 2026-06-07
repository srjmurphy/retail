import type { TrendToRackResult, TrendToolTrace } from "@/types/demo";
import type OpenAI from "openai";
import { hasOpenAIKey, getOpenAIClient } from "@/lib/openai/client";
import { TEXT_MODEL } from "@/lib/openai/models";
import { withTimeout } from "@/lib/openai/timeout";
import { combineDemandRecords } from "@/lib/demand-log/summarize";
import type { TrendInput, TrendToolName } from "./types";
import { executeTrendTool, runTrendTools } from "./tools";

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
  requestId,
  startedAt,
  startedMs,
  orchestration = "deterministic_demo",
}: {
  traces: TrendToolTrace[];
  prompt: string;
  fallbackUsed?: boolean;
  requestId: string;
  startedAt: string;
  startedMs: number;
  orchestration?: TrendToRackResult["orchestration"];
}): TrendToRackResult {
  const intents = outputFor<{
    totalSignals: number;
    highQualitySignals: number;
    missedSearches: number;
    emergingIntents: string[];
    missedRevenue: number;
  }>(traces, "analyze_customer_intents") ?? {
    totalSignals: 0,
    highQualitySignals: 0,
    missedSearches: 0,
    emergingIntents: [],
    missedRevenue: 0,
  };
  const gaps = outputFor<{
    categorySizeColourRisks: string[];
    estimatedMissedRevenue: number;
  }>(traces, "inspect_inventory_gaps") ?? {
    categorySizeColourRisks: [],
    estimatedMissedRevenue: intents.missedRevenue,
  };
  const substitutions = outputFor<{
    substitutionPatterns: string[];
  }>(traces, "summarize_substitution_trends") ?? { substitutionPatterns: [] };
  const findability = outputFor<{
    findabilityIssueCount: number;
    spreadAcrossDepartments: string[];
    recommendedStoreOpsNeed: string;
  }>(traces, "inspect_store_location_failures") ?? {
    findabilityIssueCount: 0,
    spreadAcrossDepartments: [],
    recommendedStoreOpsNeed: "No store-location analysis was required for this question.",
  };
  const competitor = outputFor<{
    label: string;
    signal: string;
    source: string;
  }>(traces, "compare_competitor_signal") ?? {
    label: "Not requested",
    signal: "No competitor signal was used.",
    source: "No external or simulated competitor evidence used.",
  };
  const actions = outputFor<{
    recommendedBuySignals: TrendToRackResult["buySignals"];
    allSignals: TrendToRackResult["buySignals"];
    recommendedActions: string[];
  }>(traces, "recommend_business_actions") ?? {
    recommendedBuySignals: [],
    allSignals: [],
    recommendedActions: [],
  };

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
    requestId,
    startedAt,
    durationMs: Date.now() - startedMs,
    mode: fallbackUsed ? "demo" : "demo",
    model: fallbackUsed ? `${TEXT_MODEL} unavailable; deterministic fallback` : "deterministic retail functions",
    orchestration,
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

const trendTools: OpenAI.Chat.Completions.ChatCompletionTool[] = toolNames.map((name) => ({
  type: "function",
  function: {
    name,
    description: {
      analyze_customer_intents: "Summarize demand volume, fulfilment, occasions, sizes and missed revenue.",
      inspect_inventory_gaps: "Find category, size and stock-depth gaps behind missed demand.",
      summarize_substitution_trends: "Identify recurring partial-match and substitution behaviour.",
      inspect_store_location_failures: "Inspect available-but-hard-to-find products and store route friction.",
      compare_competitor_signal: "Add the explicitly simulated competitor promotion signal.",
      recommend_business_actions: "Rank grounded buying, allocation and store actions by revenue and confidence.",
    }[name],
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {},
      required: [],
    },
  },
}));

async function runModelToolLoop(input: TrendInput, records: TrendInput["demandRecords"]) {
  const client = getOpenAIClient();
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are Maven, a retail intelligence orchestrator. Select only the tools needed to answer the executive question. Use tools before answering. Inventory, revenue and store facts must come from tools. Always use analyze_customer_intents and recommend_business_actions; add other tools only when relevant.",
    },
    {
      role: "user",
      content: JSON.stringify({
        executiveQuestion: input.prompt,
        threshold: input.threshold,
        demandRecordCount: records.length,
      }),
    },
  ];
  const traces: TrendToolTrace[] = [];

  for (let round = 0; round < 4; round += 1) {
    const response = await withTimeout(
      client.chat.completions.create({
        model: TEXT_MODEL,
        messages,
        tools: trendTools,
        tool_choice: "auto",
      }),
    );
    const message = response.choices[0]?.message;
    if (!message) throw new Error("Maven returned no orchestration message.");
    messages.push(message);

    if (!message.tool_calls?.length) break;

    for (const call of message.tool_calls) {
      if (call.type !== "function" || !toolNames.includes(call.function.name as TrendToolName)) continue;
      const name = call.function.name as TrendToolName;
      const toolStarted = Date.now();
      const output = executeTrendTool(name, records, input.threshold);
      traces.push({
        name,
        input: { recordCount: records.length, threshold: input.threshold },
        output,
        selectedBy: "model",
        durationMs: Date.now() - toolStarted,
      });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(output),
      });
    }

    const selected = new Set(traces.map((trace) => trace.name));
    if (selected.has("analyze_customer_intents") && selected.has("recommend_business_actions")) break;
  }

  for (const name of ["analyze_customer_intents", "recommend_business_actions"] as TrendToolName[]) {
    if (traces.some((trace) => trace.name === name)) continue;
    const toolStarted = Date.now();
    traces.push({
      name,
      input: { recordCount: records.length, threshold: input.threshold },
      output: executeTrendTool(name, records, input.threshold),
      selectedBy: "policy",
      durationMs: Date.now() - toolStarted,
    });
  }

  return traces;
}

async function synthesizeLiveBrief(traces: TrendToolTrace[], prompt: string) {
  const client = getOpenAIClient();

  // Production seam: this is where the real OpenAI call happens.
  const response = await withTimeout(
    client.chat.completions.create({
      model: TEXT_MODEL,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "maven_growth_brief",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              executiveBrief: { type: "string" },
              nextMove: { type: "string" },
            },
            required: ["executiveBrief", "nextMove"],
          },
        },
      },
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
  const requestId = `grow-${crypto.randomUUID()}`;
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const records = combineDemandRecords(input.demandRecords);
  if (!records.length) {
    return {
      requestId,
      startedAt,
      durationMs: Date.now() - startedMs,
      mode: input.mode,
      model: input.mode === "live" ? TEXT_MODEL : "deterministic retail functions",
      orchestration: input.mode === "live" ? "model_tool_loop" : "deterministic_demo",
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
    return deterministicResult({ traces, prompt: input.prompt, requestId, startedAt, startedMs });
  }

  if (!hasOpenAIKey()) {
    return deterministicResult({
      traces,
      prompt: input.prompt,
      fallbackUsed: true,
      requestId,
      startedAt,
      startedMs,
      orchestration: "fallback_demo",
    });
  }

  try {
    const selectedTraces = await runModelToolLoop(input, records);
    const liveBrief = await synthesizeLiveBrief(selectedTraces, input.prompt);
    const deterministic = deterministicResult({
      traces: selectedTraces,
      prompt: input.prompt,
      requestId,
      startedAt,
      startedMs,
      orchestration: "model_tool_loop",
    });

    return {
      ...deterministic,
      mode: "live",
      model: TEXT_MODEL,
      orchestration: "model_tool_loop",
      durationMs: Date.now() - startedMs,
      executiveBrief: liveBrief.executiveBrief || deterministic.executiveBrief,
      nextMove: deterministic.nextMove,
    };
  } catch (error) {
    console.error("Live Maven analysis failed", error);
    return deterministicResult({
      traces,
      prompt: input.prompt,
      fallbackUsed: true,
      requestId,
      startedAt,
      startedMs,
      orchestration: "fallback_demo",
    });
  }
}
