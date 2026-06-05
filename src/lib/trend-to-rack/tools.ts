import type { BuySignal, DemandRecord, TrendToolTrace } from "@/types/demo";
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
      "RetailNext should connect customer intent, stock location and associate briefing before the weekend event window.",
    source: "Deterministic mock data; no scraping performed.",
  };
}

export function recommendBusinessActions({
  records,
  threshold,
}: {
  records: DemandRecord[];
  threshold: number;
}) {
  const misses = records.filter((record) => !record.foundInStock || record.missedReason);
  const plusFormal = misses.filter((record) =>
    [...record.constraints, record.size, record.query].join(" ").toLowerCase().includes("plus"),
  );
  const wedding = records.filter((record) => record.occasion.includes("wedding"));
  const graduation = records.filter((record) => record.occasion.includes("graduation"));
  const findability = records.filter((record) =>
    [record.missedReason, ...record.constraints, record.query].join(" ").toLowerCase().includes("findability"),
  );

  const signals: BuySignal[] = [
    {
      demandPattern: "Plus-size winter formalwear gap",
      affectedStoreCategorySize: "RetailNext Oak Street / women formalwear / size 18",
      evidenceCount: plusFormal.length,
      estimatedMissedRevenue: plusFormal.reduce((sum, record) => sum + record.estimatedLostRevenue, 0),
      recommendedAction: "Brief buyers on plus-size formalwear depth and promote available substitutes transparently.",
      confidenceLevel: plusFormal.length >= 2 ? "High" : plusFormal.length === 1 ? "Medium" : "Low",
      confidenceScore: Math.min(95, 45 + plusFormal.length * 25),
    },
    {
      demandPattern: "Weekend wedding guest capsule demand",
      affectedStoreCategorySize: "RetailNext Oak Street / mens and women occasionwear / navy, black, brown",
      evidenceCount: wedding.length,
      estimatedMissedRevenue: wedding.reduce((sum, record) => sum + record.estimatedLostRevenue, 0),
      recommendedAction: "Move shirt, trouser, formal shoe and dress inventory into a weekend capsule rail.",
      confidenceLevel: wedding.length >= 3 ? "High" : wedding.length === 2 ? "Medium" : "Low",
      confidenceScore: Math.min(94, 42 + wedding.length * 18),
    },
    {
      demandPattern: "Graduation accessory partial fulfilment",
      affectedStoreCategorySize: "RetailNext Oak Street / ceremony accessories / bag and comfort footwear",
      evidenceCount: graduation.length,
      estimatedMissedRevenue: graduation.reduce((sum, record) => sum + record.estimatedLostRevenue, 0),
      recommendedAction: "Create ceremony accessory signage and monitor bag demand before reorder.",
      confidenceLevel: graduation.length >= 3 ? "High" : graduation.length === 2 ? "Medium" : "Low",
      confidenceScore: Math.min(90, 40 + graduation.length * 17),
    },
    {
      demandPattern: "Available but hard-to-find occasionwear",
      affectedStoreCategorySize: "RetailNext Oak Street / occasion dresses and shoes / cross-floor route",
      evidenceCount: findability.length,
      estimatedMissedRevenue: 0,
      recommendedAction: "Brief associates and add route signage from dresses to occasion footwear.",
      confidenceLevel: findability.length >= 2 ? "High" : findability.length === 1 ? "Medium" : "Low",
      confidenceScore: Math.min(88, 38 + findability.length * 24),
    },
  ];

  return {
    threshold,
    recommendedBuySignals: signals.filter((signal) => signal.confidenceScore >= threshold && signal.evidenceCount > 0),
    allSignals: signals,
    recommendedActions: [
      "Move inventory into a weekend wedding and gala capsule rail.",
      "Create event display or capsule rail near Occasionwear.",
      "Brief associates on cross-floor route steps and substitutions.",
      "Promote substitute looks online when in-store size depth is thin.",
      "Adjust signage between occasion dresses, formal shoes and fitting rooms.",
      "Monitor conversion, poor review themes and repeated plus-size misses.",
    ],
  };
}

export function runTrendTools(records: DemandRecord[], threshold: number) {
  const traces: TrendToolTrace[] = [
    {
      name: "analyze_customer_intents",
      input: { recordCount: records.length },
      output: analyzeCustomerIntents(records),
    },
    {
      name: "inspect_inventory_gaps",
      input: { recordCount: records.length },
      output: inspectInventoryGaps(records),
    },
    {
      name: "summarize_substitution_trends",
      input: { recordCount: records.length },
      output: summarizeSubstitutionTrends(records),
    },
    {
      name: "inspect_store_location_failures",
      input: { recordCount: records.length },
      output: inspectStoreLocationFailures(records),
    },
    {
      name: "compare_competitor_signal",
      input: { simulated: true },
      output: compareCompetitorSignal(),
    },
    {
      name: "recommend_business_actions",
      input: { threshold },
      output: recommendBusinessActions({ records, threshold }),
    },
  ];

  return traces;
}
