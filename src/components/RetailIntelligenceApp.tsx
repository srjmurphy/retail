"use client";

import { MapPinned, PackageSearch, RefreshCcw, TrendingUp } from "lucide-react";
import { useState } from "react";
import type {
  AppTab,
  DemandRecord,
  InputIntent,
  InputMode,
  RecommendationCard,
  RecommendResponse,
  RunMode,
  TechnicalTrace,
  TrendToRackResult,
} from "@/types/demo";
import { InStoreRouteView } from "./InStoreRouteView";
import { ModeToggle } from "./ModeToggle";
import { RecommendView } from "./RecommendView";
import { TrendToRackCopilot } from "./TrendToRackCopilot";

const defaultQuery =
  "I need a navy outfit for an outdoor wedding next weekend, men's, size 42, under $400.";

const tabs: {
  id: AppTab;
  title: string;
  subtitle: string;
  icon: typeof PackageSearch;
}[] = [
  {
    id: "recommend",
    title: "Recommend",
    subtitle: "Style Concierge",
    icon: PackageSearch,
  },
  {
    id: "locate",
    title: "Locate",
    subtitle: "In-store route",
    icon: MapPinned,
  },
  {
    id: "optimise",
    title: "Optimise",
    subtitle: "Trend-to-Rack Copilot",
    icon: TrendingUp,
  },
];

export function RetailIntelligenceApp() {
  const [activeTab, setActiveTab] = useState<AppTab>("recommend");
  const [mode, setMode] = useState<RunMode>("demo");
  const [fallbackBanner, setFallbackBanner] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [query, setQuery] = useState(defaultQuery);
  const [selectedSampleId, setSelectedSampleId] = useState("27152");
  const [lastIntent, setLastIntent] = useState<InputIntent | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationCard[]>([]);
  const [partialMatches, setPartialMatches] = useState<RecommendationCard[]>([]);
  const [trace, setTrace] = useState<TechnicalTrace | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<RecommendationCard | null>(null);
  const [demandRecords, setDemandRecords] = useState<DemandRecord[]>([]);
  const [threshold, setThreshold] = useState(65);
  const [trendResult, setTrendResult] = useState<TrendToRackResult | null>(null);

  function resetDemo() {
    setActiveTab("recommend");
    setMode("demo");
    setFallbackBanner(null);
    setInputMode("text");
    setQuery(defaultQuery);
    setSelectedSampleId("27152");
    setLastIntent(null);
    setRecommendations([]);
    setPartialMatches([]);
    setTrace(null);
    setSelectedProduct(null);
    setDemandRecords([]);
    setThreshold(65);
    setTrendResult(null);
  }

  function handleRecommendationResult(response: RecommendResponse) {
    setLastIntent(response.intent);
    setRecommendations(response.recommendations);
    setPartialMatches(response.partialMatches);
    setTrace(response.trace);
    setDemandRecords((records) => [...records, response.demandRecord]);
  }

  function handleLocate(recommendation: RecommendationCard) {
    setSelectedProduct(recommendation);
    setActiveTab("locate");
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="rounded-lg border border-neutral-200 bg-white/90 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                RetailNext AI retail intelligence
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-neutral-950">Recommend → Locate → Optimise</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ModeToggle mode={mode} onChange={setMode} />
              <button
                type="button"
                onClick={resetDemo}
                className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
              >
                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                Reset demo
              </button>
            </div>
          </div>

          {fallbackBanner ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
              {fallbackBanner}
            </div>
          ) : null}

          <nav className="mt-5 grid gap-2 md:grid-cols-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${
                    active
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400"
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>
                    <span className="block text-sm font-semibold">{tab.title}</span>
                    <span className={`mt-0.5 block text-xs ${active ? "text-neutral-300" : "text-neutral-500"}`}>
                      {tab.subtitle}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </header>

        <div className="mt-6">
          {activeTab === "recommend" ? (
            <RecommendView
              mode={mode}
              inputMode={inputMode}
              setInputMode={setInputMode}
              query={query}
              setQuery={setQuery}
              selectedSampleId={selectedSampleId}
              setSelectedSampleId={setSelectedSampleId}
              intent={lastIntent}
              recommendations={recommendations}
              partialMatches={partialMatches}
              trace={trace}
              onResult={handleRecommendationResult}
              onLocate={handleLocate}
              onFallback={setFallbackBanner}
            />
          ) : null}

          {activeTab === "locate" ? (
            <InStoreRouteView selected={selectedProduct} setActiveTab={setActiveTab} />
          ) : null}

          {activeTab === "optimise" ? (
            <TrendToRackCopilot
              mode={mode}
              demandRecords={demandRecords}
              threshold={threshold}
              setThreshold={setThreshold}
              result={trendResult}
              onResult={setTrendResult}
              onFallback={setFallbackBanner}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
