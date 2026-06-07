"use client";

import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  CircleDollarSign,
  Loader2,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { useState } from "react";
import type { BuySignal, DemandRecord, RunMode, TrendToRackResult } from "@/types/demo";
import { LazyPipelineOverlay, type PipelineStep } from "./LazyPipelineOverlay";

const trendSteps: PipelineStep[] = [
  {
    title: "analyze_customer_intents",
    label: "Tool",
    status: "Aggregating event-led shopping intent",
    result: "Customer intents aggregated",
  },
  {
    title: "inspect_inventory_gaps",
    label: "Tool",
    status: "Comparing demand against available stock",
    result: "Inventory gaps inspected",
  },
  {
    title: "summarize_substitution_trends",
    label: "Tool",
    status: "Detecting repeated substitution patterns",
    result: "Substitution patterns summarized",
  },
  {
    title: "inspect_store_location_failures",
    label: "Tool",
    status: "Finding products available but hard to locate",
    result: "Findability gaps inspected",
  },
  {
    title: "compare_competitor_signal",
    label: "Tool",
    status: "Checking simulated market signal",
    result: "Simulated market signal compared",
  },
  {
    title: "recommend_business_actions",
    label: "Tool",
    status: "Generating merchandising and store actions",
    result: "Growth actions generated",
  },
];

type IntentSummary = {
  totalSignals: number;
  fulfilledSearches: number;
  missedSearches: number;
  missedRevenue: number;
};

type ActionSummary = {
  allSignals: BuySignal[];
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function playPipeline(setActiveStep: (step: number) => void) {
  for (let index = 0; index < trendSteps.length; index += 1) {
    setActiveStep(index);
    await wait(420);
  }
  setActiveStep(trendSteps.length);
  await wait(220);
}

function traceOutput<T>(result: TrendToRackResult, name: string) {
  return result.trace.find((trace) => trace.name === name)?.output as T | undefined;
}

function dashboardData(result: TrendToRackResult) {
  const intents = traceOutput<IntentSummary>(result, "analyze_customer_intents");
  const actions = traceOutput<ActionSummary>(result, "recommend_business_actions");
  const allSignals = actions?.allSignals ?? result.buySignals;
  const chartSignals = [...allSignals]
    .filter((signal) => signal.evidenceCount > 0)
    .sort(
      (left, right) =>
        right.estimatedMissedRevenue - left.estimatedMissedRevenue ||
        right.confidenceScore - left.confidenceScore,
    )
    .slice(0, 3);

  return {
    totalSignals: intents?.totalSignals ?? 0,
    fulfilledSearches: intents?.fulfilledSearches ?? 0,
    missedSearches: intents?.missedSearches ?? 0,
    missedRevenue:
      intents?.missedRevenue ??
      chartSignals.reduce((sum, signal) => sum + signal.estimatedMissedRevenue, 0),
    chartSignals,
  };
}

function OpportunityChart({ signals }: { signals: BuySignal[] }) {
  const maxRevenue = Math.max(...signals.map((signal) => signal.estimatedMissedRevenue), 1);
  const barColours = ["bg-rose-500", "bg-blue-500", "bg-amber-500"];

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">Growth radar</p>
          <h2 className="mt-1 text-lg font-semibold text-neutral-950">Revenue Maven can unlock</h2>
        </div>
        <BarChart3 className="h-5 w-5 text-neutral-500" aria-hidden="true" />
      </div>

      {signals.length ? (
        <div className="mt-5 space-y-5">
          {signals.map((signal, index) => {
            const width =
              signal.estimatedMissedRevenue > 0
                ? Math.max(8, (signal.estimatedMissedRevenue / maxRevenue) * 100)
                : 3;

            return (
              <div key={signal.demandPattern}>
                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900">{signal.demandPattern}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {signal.evidenceCount} signal{signal.evidenceCount === 1 ? "" : "s"} · confidence{" "}
                      {signal.confidenceScore}
                    </p>
                  </div>
                  <p className="shrink-0 text-base font-semibold text-neutral-950">
                    ${signal.estimatedMissedRevenue}
                  </p>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-sm bg-neutral-100">
                  <div
                    className={`h-full rounded-sm ${barColours[index] ?? "bg-teal-500"}`}
                    style={{ width: `${width}%` }}
                    aria-label={`${signal.demandPattern}: $${signal.estimatedMissedRevenue}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 rounded-md bg-neutral-50 px-3 py-3 text-sm text-neutral-600">
          No demand signal has enough evidence to chart yet.
        </p>
      )}
    </section>
  );
}

function ActionNotes({ signals, fallbackActions }: { signals: BuySignal[]; fallbackActions: string[] }) {
  const actions = signals.length
    ? signals.map((signal) => ({
        title: signal.demandPattern,
        note: signal.recommendedAction,
      }))
    : fallbackActions.slice(0, 3).map((note, index) => ({
        title: `Action ${index + 1}`,
        note,
      }));

  return (
    <section className="rounded-lg border border-t-4 border-neutral-200 border-t-amber-500 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Next best moves</p>
      <div className="mt-3 divide-y divide-neutral-200">
        {actions.slice(0, 3).map((action, index) => (
          <article key={`${action.title}-${index}`} className="py-3 first:pt-0 last:pb-0">
            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-amber-500 text-xs font-semibold text-neutral-950">
                {index + 1}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-neutral-950">{action.title}</h3>
                <p className="mt-1 text-xs leading-5 text-neutral-600">{action.note}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function EvidenceDetails({ result }: { result: TrendToRackResult }) {
  const sections = [
    { title: "Demand", items: result.demandSignals },
    { title: "Inventory", items: result.inventoryGaps },
    { title: "Findability", items: result.findabilityGaps },
    { title: "Evidence", items: result.evidencePanel },
  ];

  return (
    <details className="rounded-lg border border-teal-200 bg-teal-50/40 p-5 shadow-sm">
      <summary className="flex items-center justify-between gap-4 text-sm font-semibold text-neutral-950">
        Why Maven chose this
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </summary>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <section key={section.title}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">{section.title}</h3>
            <ul className="mt-2 space-y-1 text-xs leading-5 text-neutral-600">
              {section.items.slice(0, 3).map((item) => (
                <li key={item} className="border-l-2 border-neutral-200 pl-2">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}

function ToolTrace({ result }: { result: TrendToRackResult }) {
  return (
    <details className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <summary className="flex items-center justify-between gap-4 text-sm font-semibold text-neutral-950">
        Inside Maven
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </summary>
      <div className="mt-4 space-y-3">
        {result.trace.map((trace) => (
          <div key={trace.name} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <p className="font-mono text-xs font-semibold text-neutral-950">{trace.name}</p>
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-neutral-950 p-3 text-xs leading-5 text-neutral-100">
              {JSON.stringify({ input: trace.input, output: trace.output }, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </details>
  );
}

export function TrendToRackCopilot({
  mode,
  demandRecords,
  threshold,
  setThreshold,
  result,
  onResult,
  onFallback,
}: {
  mode: RunMode;
  demandRecords: DemandRecord[];
  threshold: number;
  setThreshold: (threshold: number) => void;
  result: TrendToRackResult | null;
  onResult: (result: TrendToRackResult) => void;
  onFallback: (message: string | null) => void;
}) {
  const [prompt, setPrompt] = useState(
    "What demand are we missing before this weekend, and what should we move, promote, or brief?",
  );
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function runCopilot() {
    if (!demandRecords.length) {
      setError("Launch at least one Style story before asking Maven for a growth plan.");
      return;
    }

    setError(null);
    setLoading(true);
    setActiveStep(0);

    try {
      const requestPromise = fetch("/api/trend-to-rack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          threshold,
          demandRecords,
          mode,
        }),
      }).then(async (response) => {
        if (!response.ok) throw new Error("Maven could not complete the request.");
        return (await response.json()) as TrendToRackResult;
      });

      const [response] = await Promise.all([requestPromise, playPipeline(setActiveStep)]);
      onResult(response);
      onFallback(response.fallbackMessage);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Maven could not complete the request.");
    } finally {
      setLoading(false);
    }
  }

  const dashboard = result ? dashboardData(result) : null;
  const recommendedMove = result?.nextMove ?? "";

  return (
    <section className="space-y-5">
      <LazyPipelineOverlay
        visible={loading}
        title="Maven is connecting the signals"
        steps={trendSteps}
        activeStep={activeStep}
      />

      <section className="rounded-lg border border-t-4 border-neutral-200 border-t-violet-600 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Grow</p>
            <h1 className="mt-1 text-2xl font-semibold text-neutral-950">Ask Maven</h1>
            <p className="mt-1 text-sm text-neutral-600">Turn live customer demand into the next commercial move.</p>
          </div>
          <button
            type="button"
            onClick={runCopilot}
            disabled={loading || demandRecords.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <WandSparkles className="h-4 w-4" aria-hidden="true" />
            )}
            Find the opportunity
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <label htmlFor="trend-prompt" className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Ask Maven
            </label>
            <input
              id="trend-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="mt-2 w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:bg-white"
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="trend-threshold"
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                Signal confidence
              </label>
              <span className="text-sm font-semibold text-neutral-950">{threshold}</span>
            </div>
            <input
              id="trend-threshold"
              type="range"
              min="35"
              max="95"
              step="5"
              value={threshold}
              onChange={(event) => setThreshold(Number(event.target.value))}
              className="mt-3 h-2 w-full accent-neutral-950"
            />
          </div>
        </div>
        {demandRecords.length === 0 ? (
          <p className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
            Maven needs a customer signal first. Launch a Style story to unlock growth intelligence.
          </p>
        ) : (
          <p className="mt-4 text-xs font-medium text-neutral-500">
            {demandRecords.length} customer signal{demandRecords.length === 1 ? "" : "s"} ready for analysis.
          </p>
        )}
        {error ? <p className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}
      </section>

      {result && dashboard ? (
        <>
          <section className="rounded-lg border border-violet-800 bg-violet-800 p-5 text-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-4xl">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">Maven recommends</p>
                <h2 className="mt-2 text-xl font-semibold leading-7">{recommendedMove}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-violet-100">{result.executiveBrief}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded bg-white/15 px-2.5 py-1">
                    {dashboard.totalSignals} signals analysed
                  </span>
                  <span className="rounded bg-white/15 px-2.5 py-1">
                    {dashboard.missedSearches} miss / partial
                  </span>
                  <span className="rounded bg-white/15 px-2.5 py-1">
                    ${dashboard.missedRevenue} at risk
                  </span>
                </div>
              </div>
              <ArrowRight className="h-6 w-6 text-violet-200" aria-hidden="true" />
            </div>
          </section>

          <section className="grid grid-cols-3 divide-x divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
            <div className="bg-teal-50 p-4 text-center">
              <Sparkles className="mx-auto h-4 w-4 text-teal-700" aria-hidden="true" />
              <p className="mt-2 text-2xl font-semibold text-neutral-950">{dashboard.totalSignals}</p>
              <p className="mt-1 text-xs font-medium text-neutral-500">Live signals</p>
            </div>
            <div className="bg-amber-50 p-4 text-center">
              <SearchX className="mx-auto h-4 w-4 text-amber-700" aria-hidden="true" />
              <p className="mt-2 text-2xl font-semibold text-neutral-950">{dashboard.missedSearches}</p>
              <p className="mt-1 text-xs font-medium text-neutral-500">Miss / partial</p>
            </div>
            <div className="bg-rose-50 p-4 text-center">
              <CircleDollarSign className="mx-auto h-4 w-4 text-rose-700" aria-hidden="true" />
              <p className="mt-2 text-2xl font-semibold text-neutral-950">${dashboard.missedRevenue}</p>
              <p className="mt-1 text-xs font-medium text-neutral-500">Revenue at risk</p>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
            <OpportunityChart signals={dashboard.chartSignals} />
            <ActionNotes signals={dashboard.chartSignals} fallbackActions={result.recommendedActions} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <EvidenceDetails result={result} />
            <ToolTrace result={result} />
          </div>
        </>
      ) : (
        <section className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center">
          <SearchX className="mx-auto h-6 w-6 text-neutral-400" aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold text-neutral-950">Maven is ready for a signal</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-neutral-600">
            Launch one or more Style stories. Every sale, save and miss becomes intelligence for the next move.
          </p>
        </section>
      )}
    </section>
  );
}
