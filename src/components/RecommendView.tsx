"use client";

import { Camera, ChevronDown, ImagePlus, Search, Type } from "lucide-react";
import { useState } from "react";
import type {
  InputIntent,
  InputMode,
  RecommendationCard,
  RecommendResponse,
  RunMode,
  TechnicalTrace,
} from "@/types/demo";
import { LazyPipelineOverlay, type PipelineStep } from "./LazyPipelineOverlay";
import { ProductCard } from "./ProductCard";

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

const sampleQueries = [
  "I need a navy outfit for an outdoor wedding next weekend, men's, size 42, under $400.",
  "I need plus-size formalwear for a winter wedding this weekend, under $250.",
  "I need a black dress for a work gala this Friday, women’s size 10, under $300.",
  "I need smart casual clothes for a job interview tomorrow, men’s size M, under $250.",
  "I need a holiday party outfit, women’s size 12, under $350.",
  "I need comfortable shoes and a bag for a graduation ceremony this weekend.",
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
  onResult: (response: RecommendResponse) => void;
  onLocate: (recommendation: RecommendationCard) => void;
  onFallback: (message: string | null) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setLoading(true);
    setActiveStep(0);

    try {
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
          query,
          selectedSampleId,
          imageDataUrl,
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
    <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <LazyPipelineOverlay
        visible={loading}
        title="Running Style Concierge request"
        steps={recommendSteps}
        activeStep={activeStep}
      />

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

        <div className="mt-5 flex flex-wrap gap-2">
          {sampleQueries.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setInputMode("text");
                setQuery(sample);
              }}
              className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-left text-xs font-medium leading-5 text-neutral-700 transition hover:border-neutral-400"
            >
              {sample}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={submit}
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
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-lg font-semibold text-neutral-950">No adequate in-store result</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-700">
              The search was logged as unmet demand. Retrieval evidence and guardrail reasons remain available for the
              executive trace.
            </p>
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
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">Partial matches</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {partialMatches.map((match) => (
                <div key={match.product.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                  <p className="font-medium text-neutral-950">{match.product.productDisplayName}</p>
                  <p className="mt-1 text-sm text-neutral-600">{match.inventoryStatus.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-xs leading-5 text-neutral-600">{match.guardrail.reason}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <TechnicalTracePanel trace={trace} />
      </div>
    </section>
  );
}
