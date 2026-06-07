"use client";

import {
  Camera,
  CheckCircle2,
  ChevronDown,
  CircleX,
  ImagePlus,
  MapPin,
  Network,
  Play,
  Search,
  Type,
} from "lucide-react";
import { useState } from "react";
import type {
  InputIntent,
  InputMode,
  RecommendationCard,
  RecommendationWorkflowId,
  RecommendResponse,
  RunMode,
  TechnicalTrace,
} from "@/types/demo";
import { inventoryNextStep, inventoryStatusLabel } from "@/lib/inventory/labels";
import { LazyPipelineOverlay, type PipelineStep } from "./LazyPipelineOverlay";
import { ProductCard } from "./ProductCard";
import { getRecommendationWorkflow, RECOMMENDATION_WORKFLOWS } from "@/lib/recommend/workflows";

const recommendSteps: PipelineStep[] = [
  {
    title: "Analyzing input",
    label: "GPT-4o analysis",
    status: "Extracting occasion, style, size and budget",
    result: "Intent extracted into structured chips",
  },
  {
    title: "Retrieving matches",
    label: "Embeddings + cookbook RAG",
    status: "Searching cookbook product data by cosine similarity",
    result: "Cookbook candidates ranked",
  },
  {
    title: "Checking inventory and location",
    label: "Tool call",
    status: "Calling check_inventory_and_location",
    result: "Inventory and route facts returned",
  },
  {
    title: "Quality guardrail",
    label: "GPT-4o self-check",
    status: "Checking relevance and occasion fit",
    result: "Weak matches dropped",
  },
];

const sampleImages = [
  {
    id: "27152",
    label: "Blue formal shirt",
    path: "/sample_clothes/sample_images/27152.jpg",
  },
  {
    id: "48481",
    label: "Black dress",
    path: "/sample_clothes/sample_images/48481.jpg",
  },
  {
    id: "10616",
    label: "Gold footwear",
    path: "/sample_clothes/sample_images/10616.jpg",
  },
];

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function playPipeline(setActiveStep: (step: number) => void) {
  for (let index = 0; index < recommendSteps.length; index += 1) {
    setActiveStep(index);
    await wait(540);
  }
  setActiveStep(recommendSteps.length);
  await wait(220);
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function pathToDataUrl(path: string) {
  const response = await fetch(path);
  const blob = await response.blob();
  return fileToDataUrl(new File([blob], "sample.jpg", { type: blob.type || "image/jpeg" }));
}

function IntentChips({ intent }: { intent: InputIntent | null }) {
  if (!intent) return null;

  const chips = [
    intent.occasion,
    intent.gender,
    intent.size !== "Any" ? `size ${intent.size}` : "any size",
    intent.budget ? `under $${intent.budget}` : "no budget",
    ...intent.colours,
    ...intent.styleConstraints,
  ].filter(Boolean);

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <span key={chip} className="rounded bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">
          {chip}
        </span>
      ))}
    </div>
  );
}

function TechnicalTracePanel({ trace }: { trace: TechnicalTrace | null }) {
  if (!trace) return null;

  return (
    <details className="mt-6 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <summary className="flex items-center justify-between gap-4 text-sm font-semibold text-neutral-900">
        View technical trace
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </summary>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section>
          <h3 className="text-sm font-semibold text-neutral-950">Retrieval query</h3>
          <p className="mt-2 rounded-md bg-neutral-50 p-3 font-mono text-xs leading-5 text-neutral-700">
            {trace.retrievalQuery}
          </p>
        </section>
        <section>
          <h3 className="text-sm font-semibold text-neutral-950">Top retrieved productDisplayNames</h3>
          <ol className="mt-2 space-y-1 text-sm text-neutral-700">
            {trace.topProductDisplayNames.map((name, index) => (
              <li key={`${name}-${index}`}>{name}</li>
            ))}
          </ol>
        </section>
        <section>
          <h3 className="text-sm font-semibold text-neutral-950">Tool call result</h3>
          <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-neutral-950 p-3 text-xs leading-5 text-neutral-100">
            {JSON.stringify(trace.toolCall, null, 2)}
          </pre>
        </section>
        <section>
          <h3 className="text-sm font-semibold text-neutral-950">Guardrail reasons</h3>
          <div className="mt-2 space-y-2">
            {trace.guardrailReasons.map((reason, index) => (
              <p
                key={`${reason.productDisplayName}-${index}`}
                className="rounded-md bg-neutral-50 p-3 text-xs leading-5 text-neutral-700"
              >
                <span className="font-semibold text-neutral-950">{reason.productDisplayName}:</span> {reason.reason}
              </p>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-neutral-950">View retrieval evidence</h3>
        <div className="mt-2 overflow-hidden rounded-md border border-neutral-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Product</th>
                <th className="px-3 py-2 font-semibold">Similarity</th>
                <th className="px-3 py-2 font-semibold">Image</th>
                <th className="px-3 py-2 font-semibold">Inventory</th>
                <th className="px-3 py-2 font-semibold">Guardrail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {trace.retrievalEvidence.map((item) => (
                <tr key={item.productId}>
                  <td className="px-3 py-2 text-neutral-800">{item.productDisplayName}</td>
                  <td className="px-3 py-2 text-neutral-700">{item.similarityScore}</td>
                  <td className="px-3 py-2 text-neutral-700">{item.imageSource}</td>
                  <td className="px-3 py-2 text-neutral-700">{item.inventoryStatus}</td>
                  <td className="px-3 py-2 text-neutral-700">
                    {item.guardrail.accepted ? "Accepted" : "Dropped"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-5 text-neutral-600">{trace.rankingAnnotation}</p>
      </div>
    </details>
  );
}

const workflowIcons = {
  happy_path: CheckCircle2,
  distributed_stock: Network,
  unmet_demand: CircleX,
};

function WorkflowOutcome({
  workflowId,
  recommendations,
  partialMatches,
}: {
  workflowId: RecommendationWorkflowId;
  recommendations: RecommendationCard[];
  partialMatches: RecommendationCard[];
}) {
  const workflow = getRecommendationWorkflow(workflowId);
  if (!workflow) return null;

  const cards = [...recommendations, ...partialMatches];
  const localCount = cards.filter((card) => card.inventoryStatus === "in_stock").length;
  const nearbyCount = cards.filter((card) => card.inventoryStatus === "nearby_store").length;
  const unavailableCount = cards.filter(
    (card) => !["in_stock", "nearby_store"].includes(card.inventoryStatus),
  ).length;
  const tone =
    workflowId === "happy_path"
      ? "border-emerald-200 bg-emerald-50"
      : workflowId === "distributed_stock"
        ? "border-blue-200 bg-blue-50"
        : "border-red-200 bg-red-50";

  return (
    <section className={`rounded-lg border p-4 ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600">
            Workflow {workflow.sequence} of 3 · {workflow.label}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-neutral-950">{workflow.title}</h2>
        </div>
        <span className="rounded bg-white px-2.5 py-1 text-xs font-semibold text-neutral-800 shadow-sm">
          {workflow.expectedOutcome}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 divide-x divide-neutral-300/70 rounded-md border border-white/80 bg-white/70">
        <div className="px-3 py-3 text-center">
          <p className="text-2xl font-semibold text-emerald-700">{localCount}</p>
          <p className="mt-1 text-xs font-medium text-neutral-600">This store</p>
        </div>
        <div className="px-3 py-3 text-center">
          <p className="text-2xl font-semibold text-blue-700">{nearbyCount}</p>
          <p className="mt-1 text-xs font-medium text-neutral-600">Nearby</p>
        </div>
        <div className="px-3 py-3 text-center">
          <p className="text-2xl font-semibold text-red-700">{unavailableCount}</p>
          <p className="mt-1 text-xs font-medium text-neutral-600">Unavailable</p>
        </div>
      </div>
    </section>
  );
}

export function RecommendView({
  mode,
  inputMode,
  setInputMode,
  query,
  setQuery,
  selectedSampleId,
  setSelectedSampleId,
  intent,
  recommendations,
  partialMatches,
  trace,
  activeWorkflowId,
  onResult,
  onLocate,
  onFallback,
}: {
  mode: RunMode;
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
  query: string;
  setQuery: (query: string) => void;
  selectedSampleId: string;
  setSelectedSampleId: (id: string) => void;
  intent: InputIntent | null;
  recommendations: RecommendationCard[];
  partialMatches: RecommendationCard[];
  trace: TechnicalTrace | null;
  activeWorkflowId: RecommendationWorkflowId | null;
  onResult: (response: RecommendResponse) => void;
  onLocate: (recommendation: RecommendationCard) => void;
  onFallback: (message: string | null) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function submit({
    queryOverride,
    workflowId,
  }: {
    queryOverride?: string;
    workflowId?: RecommendationWorkflowId;
  } = {}) {
    setError(null);
    setLoading(true);
    setActiveStep(0);

    try {
      const requestQuery = queryOverride ?? query;
      let imageDataUrl = uploadedImageDataUrl;
      const sample = sampleImages.find((item) => item.id === selectedSampleId);

      if (mode === "live" && inputMode === "photo" && !imageDataUrl && sample) {
        imageDataUrl = await pathToDataUrl(sample.path);
      }

      const requestPromise = fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          inputMode,
          query: requestQuery,
          selectedSampleId,
          imageDataUrl,
          workflowId,
        }),
      }).then(async (response) => {
        if (!response.ok) throw new Error("Recommendation request failed.");
        return (await response.json()) as RecommendResponse;
      });

      const [response] = await Promise.all([requestPromise, playPipeline(setActiveStep)]);
      onResult(response);
      onFallback(response.fallbackMessage);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Recommendation request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <LazyPipelineOverlay
        visible={loading}
        title="Running Style Concierge request"
        steps={recommendSteps}
        activeStep={activeStep}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Recommend</p>
            <h1 className="mt-1 text-2xl font-semibold text-neutral-950">Style Concierge</h1>
          </div>
          <div className="flex rounded-md border border-neutral-200 bg-neutral-50 p-1">
            <button
              type="button"
              onClick={() => setInputMode("text")}
              className={`flex items-center gap-2 rounded px-3 py-2 text-sm font-medium ${
                inputMode === "text" ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-600"
              }`}
            >
              <Type className="h-4 w-4" aria-hidden="true" />
              Occasion text
            </button>
            <button
              type="button"
              onClick={() => setInputMode("photo")}
              className={`flex items-center gap-2 rounded px-3 py-2 text-sm font-medium ${
                inputMode === "photo" ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-600"
              }`}
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              Photo mode
            </button>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-sm font-semibold text-neutral-900">Select a workflow</p>
          <div className="mt-3 grid gap-3">
            {RECOMMENDATION_WORKFLOWS.map((workflow) => {
              const Icon = workflowIcons[workflow.id];
              const active = activeWorkflowId === workflow.id;

              return (
                <article
                  key={workflow.id}
                  className={`rounded-md border p-4 transition ${
                    active
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-neutral-200 bg-neutral-50 text-neutral-950"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                        active ? "bg-white/15 text-white" : "bg-white text-neutral-800 shadow-sm"
                      }`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-semibold uppercase ${
                          active ? "text-neutral-300" : "text-neutral-500"
                        }`}
                      >
                        {workflow.label}
                      </p>
                      <h2 className="mt-1 text-base font-semibold">{workflow.title}</h2>
                      <p className={`mt-1 text-sm leading-5 ${active ? "text-neutral-300" : "text-neutral-600"}`}>
                        {workflow.description}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`mt-3 rounded-md border px-3 py-2 text-xs leading-5 ${
                      active
                        ? "border-white/15 bg-white/10 text-neutral-100"
                        : "border-neutral-200 bg-white text-neutral-700"
                    }`}
                  >
                    “{workflow.query}”
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className={`text-xs font-medium ${active ? "text-white" : "text-neutral-800"}`}>
                      {workflow.expectedOutcome}
                    </p>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setInputMode("text");
                        setQuery(workflow.query);
                        void submit({ queryOverride: workflow.query, workflowId: workflow.id });
                      }}
                      className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        active
                          ? "bg-white text-neutral-950 hover:bg-neutral-100"
                          : "bg-neutral-950 text-white hover:bg-neutral-800"
                      }`}
                    >
                      <Play className="h-4 w-4" aria-hidden="true" />
                      Run workflow
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {inputMode === "text" ? (
          <div className="mt-5">
            <label htmlFor="style-query" className="text-sm font-semibold text-neutral-900">
              Customer intent
            </label>
            <textarea
              id="style-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              rows={5}
              className="mt-2 w-full resize-none rounded-md border border-neutral-300 bg-neutral-50 px-3 py-3 text-sm leading-6 text-neutral-950 outline-none transition focus:border-neutral-950 focus:bg-white"
            />
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {sampleImages.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => {
                    setSelectedSampleId(sample.id);
                    setUploadedImageDataUrl("");
                  }}
                  className={`rounded-lg border p-2 text-left transition ${
                    selectedSampleId === sample.id && !uploadedImageDataUrl
                      ? "border-neutral-950 bg-neutral-50"
                      : "border-neutral-200 bg-white hover:border-neutral-400"
                  }`}
                >
                  <img src={sample.path} alt={sample.label} className="h-28 w-full rounded-md object-contain" />
                  <span className="mt-2 block text-xs font-medium text-neutral-700">{sample.label}</span>
                </button>
              ))}
            </div>
            <label className="flex items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-3 py-4 text-sm font-medium text-neutral-700">
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              Upload image
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setUploadedImageDataUrl(await fileToDataUrl(file));
                }}
              />
            </label>
            {uploadedImageDataUrl ? (
              <img src={uploadedImageDataUrl} alt="Uploaded style input" className="h-36 rounded-md object-contain" />
            ) : null}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Run Style Concierge
          </button>
          {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        </div>
      </div>

      <div className="space-y-6">
        {activeWorkflowId && trace ? (
          <WorkflowOutcome
            workflowId={activeWorkflowId}
            recommendations={recommendations}
            partialMatches={partialMatches}
          />
        ) : null}
        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Extracted intent</p>
              <h2 className="mt-1 text-lg font-semibold text-neutral-950">
                {intent ? intent.occasion : "Ready for first request"}
              </h2>
            </div>
            <IntentChips intent={intent} />
          </div>
        </div>

        {recommendations.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {recommendations.map((recommendation) => (
              <ProductCard key={recommendation.product.id} recommendation={recommendation} onLocate={onLocate} />
            ))}
          </div>
        ) : trace ? (
          <div
            className={`rounded-lg border p-5 ${
              activeWorkflowId === "unmet_demand"
                ? "border-red-200 bg-red-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <h2 className="text-lg font-semibold text-neutral-950">
              {activeWorkflowId === "unmet_demand"
                ? "Nothing available across the three-store network"
                : "No exact in-store match"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-700">
              {activeWorkflowId === "unmet_demand"
                ? "Relevant products were found, but none carry the requested size. The request is logged as unmet demand rather than presented as a viable recommendation."
                : "The search was logged as unmet demand for the selected store. Closest cross-sell and nearby-store options are shown below when available, clearly labelled as alternatives rather than exact matches."}
            </p>
            <div
              className={`mt-4 rounded-md border bg-white/75 p-4 ${
                activeWorkflowId === "unmet_demand" ? "border-red-300" : "border-amber-300"
              }`}
            >
              <p className="text-sm font-semibold text-neutral-950">Store assistant handoff</p>
              <p className="mt-2 text-sm leading-6 text-neutral-700">
                {activeWorkflowId === "unmet_demand"
                  ? "Confirm the size requirement, check online or special-order options, and retain the demand signal for the buying team. Do not offer the pictured alternatives as available."
                  : "Ask an associate to reserve nearby stock, check online availability, or offer the closest substitute only after confirming the requested size and event need."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white"
                >
                  Send to store assistant
                </button>
                <button
                  type="button"
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-900"
                >
                  {activeWorkflowId === "unmet_demand" ? "Check online / special order" : "Check online / nearby stores"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-950">Cookbook-backed results will appear here</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Product cards use local sample images when the product ID has a matching cookbook JPG.
            </p>
          </div>
        )}

        {partialMatches.length ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">
              {recommendations.length ? "Partial matches" : "Closest cross-sell options"}
            </h2>
            {!recommendations.length ? (
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                These options are not a match to the full request. They give the associate a grounded next-best action
                without inventing stock, size, price or location facts.
              </p>
            ) : null}
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {partialMatches.map((match) => (
                <div key={match.product.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-neutral-950">{match.product.productDisplayName}</p>
                      <p className="mt-1 text-sm text-neutral-600">
                        {match.product.articleType} · ${match.product.price}
                      </p>
                    </div>
                    <span
                      className={`rounded px-2 py-1 text-xs font-semibold ${
                        match.inventoryStatus === "in_stock"
                          ? "bg-emerald-50 text-emerald-700"
                          : match.inventoryStatus === "nearby_store"
                            ? "bg-blue-50 text-blue-700"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {inventoryStatusLabel(match.inventoryStatus)}
                    </span>
                  </div>
                  {match.inventory ? (
                    <p className="mt-2 rounded bg-white px-2.5 py-2 text-xs font-medium leading-5 text-neutral-700">
                      {match.inventory.storeName}, {match.inventory.city} · size {match.inventory.size} ·{" "}
                      {match.inventory.pickupAvailability}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs leading-5 text-neutral-600">{match.guardrail.reason}</p>
                  <p className="mt-2 text-xs leading-5 text-neutral-600">{inventoryNextStep(match.inventoryStatus)}</p>
                  {match.location &&
                  (match.inventoryStatus === "in_stock" || match.inventoryStatus === "nearby_store") ? (
                    <button
                      type="button"
                      onClick={() => onLocate(match)}
                      className="mt-3 inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-900"
                    >
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {match.inventoryStatus === "nearby_store" ? "Open nearby route" : "Open store route"}
                    </button>
                  ) : null}
                  {!recommendations.length ? (
                    <p className="mt-2 text-xs font-medium leading-5 text-neutral-800">{match.rankingReason}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <TechnicalTracePanel trace={trace} />
      </div>
      </div>
    </section>
  );
}
