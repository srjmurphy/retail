import type { BuySignal, DemandRecord, TrendToolTrace } from "@/types/demo";
import type { TrendToolName } from "./types";
import { STORE_LOCATIONS } from "@/lib/store-route/locations";
import { getInventoryRecords } from "@/lib/inventory/tools";
import { countBy, sumMissedRevenue } from "@/lib/demand-log/summarize";

function topEntries(counts: Record<string, number>, limit = 4) {
  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([name, count]) => `${name}: ${count}`);
}

export function analyzeCustomerIntents(records: DemandRecord[]) {
  const misses = records.filter((record) => !record.foundInStock);
  const highQuality = records.filter((record) => record.demandQualityScore >= 80);

  return {
    totalSignals: records.length,
    highQualitySignals: highQuality.length,
    fulfilledSearches: records.filter((record) => record.foundInStock).length,
    missedSearches: misses.length,
    emergingIntents: topEntries(countBy(records, "occasion")),
    sizes: topEntries(countBy(records, "size")),
    missedRevenue: sumMissedRevenue(records),
  };
}

export function inspectInventoryGaps(records: DemandRecord[]) {
  const misses = records.filter((record) => !record.foundInStock || record.missedReason);
  const plusSizeMisses = misses.filter((record) =>
    [...record.constraints, record.size, record.query].join(" ").toLowerCase().includes("plus"),
  );
  const bagAccessoryMisses = misses.filter((record) =>
    [...record.requestedItems, record.query].join(" ").toLowerCase().includes("bag"),
  );
  const lowStock = getInventoryRecords()
    .filter((record) => record.stockCount <= 2)
    .map((record) => `${record.productId} size ${record.size}: ${record.stockCount} units`);

  return {
    understockedStores: ["RetailNext Oak Street"],
    categorySizeColourRisks: [
      plusSizeMisses.length
        ? `${plusSizeMisses.length} plus-size formalwear signal(s) without in-store fulfilment`
        : "No plus-size formalwear threshold crossed",
      bagAccessoryMisses.length
        ? `${bagAccessoryMisses.length} graduation accessory / bag signal(s) only partially fulfilled`
        : "No bag accessory threshold crossed",
      ...lowStock.slice(0, 4),
    ],
    evidenceRecordIds: misses.map((record) => record.id),
    estimatedMissedRevenue: sumMissedRevenue(misses),
  };
}

export function summarizeSubstitutionTrends(records: DemandRecord[]) {
  const partials = records.filter((record) => record.missedReason && record.foundRelevantMatch);

  return {
    substitutionPatterns: [
      partials.some((record) => record.query.toLowerCase().includes("bag"))
        ? "Graduation bag requests are being substituted with footwear and light ceremony dresses."
        : "No repeated bag substitution pattern yet.",
      "Navy and black occasionwear searches are being fulfilled, but stock depth is thin on selected sizes.",
      "Outdoor wedding menswear is resolving through shirt, trouser, shoe and tie separates rather than one complete suit.",
    ],
    partialCount: partials.length,
    evidenceRecordIds: partials.map((record) => record.id),
  };
}

export function inspectStoreLocationFailures(records: DemandRecord[]) {
  const findabilityRecords = records.filter((record) =>
    [record.missedReason, ...record.constraints, record.query].join(" ").toLowerCase().includes("findability"),
  );
  const spread = STORE_LOCATIONS.filter((location) =>
    ["Womenswear", "Women's Shoes", "Menswear", "Men's Shoes"].includes(location.department),
  ).map((location) => `${location.productId}: ${location.department}, ${location.floor}, ${location.aisle}, ${location.bay}`);

  return {
    findabilityIssueCount: findabilityRecords.length,
    productsAvailableButHardToLocate: findabilityRecords.map((record) => record.selectedProductIds).flat(),
    spreadAcrossDepartments: spread.slice(0, 8),
    recommendedStoreOpsNeed:
      "Create weekend occasionwear route cards and brief associates on cross-floor shoe, dress and accessory paths.",
  };
}

export function compareCompetitorSignal() {
  return {
    label: "Simulated market signal",
    signal: "Nearby competitor is promoting wedding guest capsule edits this week.",
    implication:
      "Connect customer intent, stock location and associate briefing before the weekend event window.",
    source: "Deterministic mock data; no scraping performed.",
  };
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

function primaryRequestedItem(record: DemandRecord) {
  return (
    record.requestedItems.find((item) => !["outfit", "clothes"].includes(item.toLowerCase())) ??
    record.category ??
    "assortment"
  ).toLowerCase();
}

function missedDemandSignal(records: DemandRecord[]): BuySignal[] {
  const groups = new Map<string, DemandRecord[]>();

  for (const record of records.filter((item) => !item.foundInStock || item.missedReason)) {
    const item = primaryRequestedItem(record);
    const plusSize = [...record.constraints, record.size, record.query]
      .join(" ")
      .toLowerCase()
      .includes("plus");
    const key = [plusSize ? "plus-size" : "standard", record.occasion, item, record.gender, record.size].join("|");
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }

  return Array.from(groups.values()).map((group) => {
    const example = group[0];
    const item = primaryRequestedItem(example);
    const plusSize = [...example.constraints, example.size, example.query]
      .join(" ")
      .toLowerCase()
      .includes("plus");
    const averageQuality = group.reduce((sum, record) => sum + record.demandQualityScore, 0) / group.length;
    const confidenceScore = Math.min(95, Math.round(42 + group.length * 20 + averageQuality * 0.12));
    const demandPattern = plusSize
      ? `Plus-size ${example.occasion.replace(" wedding", "")} ${item} gap`
      : `${titleCase(example.occasion)} ${item}${example.size !== "Any" ? ` size ${example.size}` : ""} gap`;
    const networkScope = example.missedReason?.toLowerCase().includes("three-store")
      ? "Three-store network"
      : example.store;
    const recommendedAction = plusSize
      ? `Increase size ${example.size} ${item} depth across the three-store network; use online or special order until stock lands.`
      : example.foundRelevantMatch
        ? `Reallocate or buy ${item}${example.size !== "Any" ? ` in size ${example.size}` : ""} for ${example.occasion} demand; use nearby or online fulfilment meanwhile.`
        : `Review the ${item} assortment for ${example.occasion} demand and test a targeted range before the next event window.`;

    return {
      demandPattern,
      affectedStoreCategorySize: `${networkScope} / ${example.gender.toLowerCase()} ${item} / size ${example.size}`,
      evidenceCount: group.length,
      estimatedMissedRevenue: group.reduce((sum, record) => sum + record.estimatedLostRevenue, 0),
      recommendedAction,
      confidenceLevel: confidenceScore >= 80 ? "High" : confidenceScore >= 60 ? "Medium" : "Low",
      confidenceScore,
    };
  });
}

export function recommendBusinessActions({
  records,
  threshold,
}: {
  records: DemandRecord[];
  threshold: number;
}) {
  const findability = records.filter((record) =>
    [record.missedReason, ...record.constraints, record.query].join(" ").toLowerCase().includes("findability"),
  );
  const signals: BuySignal[] = [
    ...missedDemandSignal(records),
    ...(findability.length
      ? [{
      demandPattern: "Available but hard-to-find occasionwear",
      affectedStoreCategorySize: "RetailNext Oak Street / occasion dresses and shoes / cross-floor route",
      evidenceCount: findability.length,
      estimatedMissedRevenue: 0,
      recommendedAction: "Brief associates and add route signage from dresses to occasion footwear.",
      confidenceLevel: findability.length >= 2 ? "High" : findability.length === 1 ? "Medium" : "Low",
      confidenceScore: Math.min(88, 38 + findability.length * 24),
    } satisfies BuySignal]
      : []),
  ];
  const rankedSignals = [...signals].sort(
    (left, right) =>
      right.estimatedMissedRevenue - left.estimatedMissedRevenue ||
      right.confidenceScore - left.confidenceScore,
  );

  return {
    threshold,
    recommendedBuySignals: rankedSignals.filter(
      (signal) => signal.confidenceScore >= threshold && signal.evidenceCount > 0,
    ),
    allSignals: rankedSignals,
    recommendedActions: [
      ...rankedSignals.slice(0, 3).map((signal) => signal.recommendedAction),
      "Brief associates on cross-floor route steps and substitutions.",
      "Monitor conversion and repeated misses as new customer evidence arrives.",
    ],
  };
}

/*
 * VIDEO ANCHOR: GROW ANALYTICS TOOLS
 * - Each tool performs a bounded analysis over trusted demand records.
 * - The model may select tools, but deterministic code calculates evidence and revenue.
 * - The same functions support the repeatable demo path and the Live tool loop.
 */
export function runTrendTools(records: DemandRecord[], threshold: number) {
  const traces: TrendToolTrace[] = [
    {
      name: "analyze_customer_intents",
      input: { recordCount: records.length },
      output: analyzeCustomerIntents(records),
      selectedBy: "demo",
    },
    {
      name: "inspect_inventory_gaps",
      input: { recordCount: records.length },
      output: inspectInventoryGaps(records),
      selectedBy: "demo",
    },
    {
      name: "summarize_substitution_trends",
      input: { recordCount: records.length },
      output: summarizeSubstitutionTrends(records),
      selectedBy: "demo",
    },
    {
      name: "inspect_store_location_failures",
      input: { recordCount: records.length },
      output: inspectStoreLocationFailures(records),
      selectedBy: "demo",
    },
    {
      name: "compare_competitor_signal",
      input: { simulated: true },
      output: compareCompetitorSignal(),
      selectedBy: "demo",
    },
    {
      name: "recommend_business_actions",
      input: { threshold },
      output: recommendBusinessActions({ records, threshold }),
      selectedBy: "demo",
    },
  ];

  return traces;
}

export function executeTrendTool(name: TrendToolName, records: DemandRecord[], threshold: number) {
  switch (name) {
    case "analyze_customer_intents":
      return analyzeCustomerIntents(records);
    case "inspect_inventory_gaps":
      return inspectInventoryGaps(records);
    case "summarize_substitution_trends":
      return summarizeSubstitutionTrends(records);
    case "inspect_store_location_failures":
      return inspectStoreLocationFailures(records);
    case "compare_competitor_signal":
      return compareCompetitorSignal();
    case "recommend_business_actions":
      return recommendBusinessActions({ records, threshold });
  }
}
