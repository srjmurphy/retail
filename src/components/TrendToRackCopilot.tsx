"use client";

import { ChevronDown, LineChart, Loader2, SlidersHorizontal, WandSparkles } from "lucide-react";
import { useState } from "react";
import type { DemandRecord, RunMode, TrendToRackResult } from "@/types/demo";
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
    result: "Executive actions generated",
  },
];

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

function SectionList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">{title}</h3>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-neutral-700">
        {items.map((item) => (
          <li key={item} className="rounded-md bg-neutral-50 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ToolTrace({ result }: { result: TrendToRackResult | null }) {
  if (!result) return null;

  return (
    <details className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <summary className="flex items-center justify-between gap-4 text-sm font-semibold text-neutral-950">
        View tool-call trace
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
    "What demand are we missing before this weekend, and what should RetailNext move, promote, or brief?",
  );
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function runCopilot() {
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
        if (!response.ok) throw new Error("Trend-to-Rack request failed.");
        return (await response.json()) as TrendToRackResult;
      });

      const [response] = await Promise.all([requestPromise, playPipeline(setActiveStep)]);
      onResult(response);
      onFallback(response.fallbackMessage);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Trend-to-Rack request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <LazyPipelineOverlay
        visible={loading}
        title="Running Trend-to-Rack analysis"
        steps={trendSteps}
        activeStep={activeStep}
      />

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Optimise</p>
              <h1 className="mt-1 text-2xl font-semibold text-neutral-950">Trend-to-Rack Copilot</h1>
            </div>
            <LineChart className="h-6 w-6 text-neutral-500" aria-hidden="true" />
          </div>

          <label htmlFor="trend-prompt" className="mt-5 block text-sm font-semibold text-neutral-900">
            Core question
          </label>
          <textarea
            id="trend-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={4}
            className="mt-2 w-full resize-none rounded-md border border-neutral-300 bg-neutral-50 px-3 py-3 text-sm leading-6 text-neutral-950 outline-none transition focus:border-neutral-950 focus:bg-white"
          />

          <div className="mt-5 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                <p className="text-sm font-semibold text-neutral-950">Confidence / volume threshold</p>
              </div>
              <p className="rounded bg-neutral-950 px-2.5 py-1 text-sm font-semibold text-white">{threshold}</p>
            </div>
            <input
              type="range"
              min="35"
              max="95"
              step="5"
              value={threshold}
              onChange={(event) => setThreshold(Number(event.target.value))}
              className="mt-4 h-2 w-full accent-neutral-950"
            />
            <p className="mt-2 text-xs leading-5 text-neutral-600">
              One weird search should not trigger merchandising action.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-md bg-neutral-50 p-3">
              <p className="text-2xl font-semibold text-neutral-950">{demandRecords.length}</p>
              <p className="text-xs font-medium text-neutral-500">Live searches</p>
            </div>
            <div className="rounded-md bg-neutral-50 p-3">
              <p className="text-2xl font-semibold text-neutral-950">
                {demandRecords.filter((record) => record.foundInStock).length}
              </p>
              <p className="text-xs font-medium text-neutral-500">Fulfilled</p>
            </div>
            <div className="rounded-md bg-neutral-50 p-3">
              <p className="text-2xl font-semibold text-neutral-950">
                {demandRecords.filter((record) => !record.foundInStock || record.missedReason).length}
              </p>
              <p className="text-xs font-medium text-neutral-500">Miss / partial</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runCopilot}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <WandSparkles className="h-4 w-4" aria-hidden="true" />}
              Run copilot
            </button>
            {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Executive action brief</p>
          {result ? (
            <>
              <h2 className="mt-2 text-xl font-semibold text-neutral-950">{result.nextMove}</h2>
              <p className="mt-3 text-sm leading-6 text-neutral-700">{result.executiveBrief}</p>
            </>
          ) : (
            <>
              <h2 className="mt-2 text-xl font-semibold text-neutral-950">Demand signals are ready</h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                Run the copilot after Recommend searches to turn hits, misses and findability issues into merchandising
                actions.
              </p>
            </>
          )}
        </div>
      </div>

      {result ? (
        <>
          <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Recommended Buy Signals
            </h2>
            {result.buySignals.length ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {result.buySignals.map((signal) => (
                  <article key={signal.demandPattern} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-neutral-950">{signal.demandPattern}</h3>
                        <p className="mt-1 text-sm text-neutral-600">{signal.affectedStoreCategorySize}</p>
                      </div>
                      <span className="rounded bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {signal.confidenceLevel} {signal.confidenceScore}
                      </span>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="font-semibold text-neutral-950">Evidence count</dt>
                        <dd className="text-neutral-600">{signal.evidenceCount}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-neutral-950">Estimated missed revenue</dt>
                        <dd className="text-neutral-600">${signal.estimatedMissedRevenue}</dd>
                      </div>
                    </dl>
                    <p className="mt-3 text-sm leading-6 text-neutral-700">{signal.recommendedAction}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                No demand gap has crossed the current threshold.
              </p>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionList title="Demand signal" items={result.demandSignals} />
            <SectionList title="Inventory gap" items={result.inventoryGaps} />
            <SectionList title="Store findability gap" items={result.findabilityGaps} />
            <SectionList title="Recommended actions" items={result.recommendedActions} />
            <SectionList title="Evidence panel" items={result.evidencePanel} />
            <SectionList title="Business impact" items={result.businessImpact} />
          </div>

          <ToolTrace result={result} />
        </>
      ) : null}
    </section>
  );
}
