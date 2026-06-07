import type {
  DemandRecord,
  GuardrailResult,
  InputMode,
  InventoryRecord,
  RecommendationCard,
  RecommendResponse,
  RecommendationWorkflowId,
  RunMode,
  StoreLocationRecord,
  TechnicalTrace,
} from "@/types/demo";
import type { CatalogItem } from "@/lib/catalog/types";
import { hasOpenAIKey, getOpenAIClient } from "@/lib/openai/client";
import { EMBEDDING_MODEL, TEXT_MODEL, VISION_MODEL } from "@/lib/openai/models";
import { withTimeout } from "@/lib/openai/timeout";
import { checkInventoryAndLocation } from "@/lib/inventory/tools";
import type { InventoryToolResult } from "@/lib/inventory/types";
import { analyzeInputDemo, analyzeInputLive } from "./analyze";
import { buildRetrievalQuery, retrieveMatchesDemo, retrieveMatchesLive, type RetrievedCandidate } from "@/lib/cookbook-rag/retrieval";
import { guardrailCheckDemo, guardrailCheckLive } from "@/lib/cookbook-rag/guardrail";
import { getCatalogItem } from "@/lib/catalog/enrichCatalog";
import { getRecommendationWorkflow } from "./workflows";

export type RecommendationRequest = {
  mode: RunMode;
  inputMode: InputMode;
  query: string;
  selectedSampleId?: string;
  imageDataUrl?: string;
  workflowId?: RecommendationWorkflowId;
};

function toCatalogCard(item: CatalogItem) {
  const { searchText: _searchText, ...card } = item;
  return card;
}

function inventoryLabel(result: InventoryToolResult | undefined) {
  if (!result) return "not_ranged";
  return result.status;
}

function buildWhy(item: CatalogItem, status: InventoryToolResult, intentOccasion: string) {
  const priceText = `$${item.price}`;
  const availability =
    status.status === "in_stock"
      ? `in stock at ${status.inventory?.storeName}`
      : status.status === "nearby_store"
        ? `not in stock at the selected store, but available at ${status.inventory?.storeName}`
      : status.status === "online_only"
        ? "available online only"
      : status.status === "out_of_stock"
        ? "currently out of stock in the requested size"
        : "not stocked at this store";

  return `${item.productDisplayName} matches ${intentOccasion} through ${item.styleTags
    .slice(0, 3)
    .join(", ")}. It is ${priceText} and ${availability}.`;
}

function rankResults(cards: RecommendationCard[]) {
  return [...cards].sort((left, right) => {
    const leftAccepted = left.guardrail.accepted ? 1 : 0;
    const rightAccepted = right.guardrail.accepted ? 1 : 0;
    const leftStock = left.inventoryStatus === "in_stock" ? 2 : left.inventoryStatus === "nearby_store" ? 1 : 0;
    const rightStock = right.inventoryStatus === "in_stock" ? 2 : right.inventoryStatus === "nearby_store" ? 1 : 0;
    const leftBusiness =
      left.product.inventory_health_score * 0.002 + left.product.commercial_priority_score * 0.0015;
    const rightBusiness =
      right.product.inventory_health_score * 0.002 + right.product.commercial_priority_score * 0.0015;

    return (
      rightAccepted - leftAccepted ||
      rightStock - leftStock ||
      right.similarityScore - left.similarityScore ||
      rightBusiness - leftBusiness
    );
  });
}

function estimateLostRevenue({
  foundInStock,
  budget,
  cards,
}: {
  foundInStock: boolean;
  budget: number | null;
  cards: RecommendationCard[];
}) {
  if (foundInStock) return 0;
  if (budget) return Math.min(budget, 350);
  const relevantPrices = cards.filter((card) => card.guardrail.accepted).map((card) => card.product.price);
  if (!relevantPrices.length) return 220;
  return Math.round(relevantPrices.reduce((sum, price) => sum + price, 0) / relevantPrices.length);
}

function demandMissedReason({
  foundRelevantMatch,
  foundInStock,
  query,
}: {
  foundRelevantMatch: boolean;
  foundInStock: boolean;
  query: string;
}) {
  if (foundInStock) return null;
  if (/plus[-\s]?size/i.test(query)) {
    return "Unmet demand: plus-size formalwear is not available in the requested size across the three-store network.";
  }
  if (foundRelevantMatch) {
    return "Relevant products were found, but no adequate in-store stock matched the request.";
  }
  return "No adequate relevant match passed the guardrail.";
}

function createDemandRecord({
  request,
  recommendations,
  allCards,
  foundRelevantMatch,
  foundInStock,
}: {
  request: RecommendationRequest;
  recommendations: RecommendationCard[];
  allCards: RecommendationCard[];
  foundRelevantMatch: boolean;
  foundInStock: boolean;
}): DemandRecord {
  const intent = allCards[0]?.product
    ? null
    : null;
  const selected = recommendations.map((recommendation) => recommendation.product.id);
  const budget = request.query.match(/(?:under|below|less than)\s*\$?(\d+)/i)?.[1];
  const extractedIntent = request.query ? undefined : undefined;

  return {
    id: `demand-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    query: request.query || "Photo-mode sample analysis",
    inputMode: request.inputMode,
    mode: request.mode,
    occasion: allCards[0]?.product.occasionTags[0] ?? "occasionwear",
    requestedItems: selected.length
      ? Array.from(new Set(recommendations.map((recommendation) => recommendation.product.articleType.toLowerCase())))
      : ["formalwear"],
    gender: recommendations[0]?.product.gender ?? (request.query.toLowerCase().includes("women") ? "Women" : "Men"),
    size:
      request.query.match(/size\s*([a-z]|\d{1,2})/i)?.[1]?.toUpperCase() ??
      (request.query.toLowerCase().includes("plus") ? "18" : "Any"),
    budget: budget ? Number(budget) : null,
    constraints: [
      request.query.toLowerCase().includes("plus") ? "plus-size" : "",
      request.query.toLowerCase().includes("outdoor") ? "outdoor" : "",
      request.query.toLowerCase().includes("comfortable") ? "comfortable" : "",
    ].filter(Boolean),
    foundRelevantMatch,
    foundInStock,
    selectedProductIds: selected,
    missedReason: demandMissedReason({
      foundRelevantMatch,
      foundInStock,
      query: request.query,
    }),
    estimatedLostRevenue: estimateLostRevenue({ foundInStock, budget: budget ? Number(budget) : null, cards: allCards }),
    store: "RetailNext Oak Street",
    category: recommendations[0]?.product.subCategory ?? "occasionwear",
    demandQualityScore: request.query.match(/(?:under|below|less than)\s*\$?(\d+)/i) ? 88 : 74,
    source: "Maven Stylist",
  };
}

async function executeInventoryToolLive({
  productIds,
  size,
}: {
  productIds: string[];
  size: string;
}) {
  const client = getOpenAIClient();

  // Production seam: this is where the real OpenAI tool call happens.
  const response = await withTimeout(
    client.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You must call check_inventory_and_location for the supplied product IDs. Do not answer directly.",
        },
        {
          role: "user",
          content: JSON.stringify({
            productIds,
            size,
            storeId: "oak-street",
          }),
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "check_inventory_and_location",
            description: "Check verified inventory and in-store location for product IDs.",
            parameters: {
              type: "object",
              properties: {
                productIds: {
                  type: "array",
                  items: { type: "string" },
                },
                size: { type: "string" },
                storeId: { type: "string" },
              },
              required: ["productIds", "size"],
            },
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: {
          name: "check_inventory_and_location",
        },
      },
    }),
  );

  const call = response.choices[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("OpenAI did not call check_inventory_and_location.");

  const args = JSON.parse(call.function.arguments || "{}") as {
    productIds?: string[];
    size?: string;
    storeId?: string;
  };

  return {
    args: {
      productIds: args.productIds ?? productIds,
      size: args.size ?? size,
      storeId: args.storeId ?? "oak-street",
    },
    results: checkInventoryAndLocation({
      productIds: args.productIds ?? productIds,
      size: args.size ?? size,
      storeId: args.storeId ?? "oak-street",
    }),
  };
}

function executeInventoryToolDemo(productIds: string[], size: string) {
  return {
    args: {
      productIds,
      size,
      storeId: "oak-street",
    },
    results: checkInventoryAndLocation({
      productIds,
      size,
      storeId: "oak-street",
    }),
  };
}

function workflowCandidates(workflowId: RecommendationWorkflowId | undefined, retrieved: RetrievedCandidate[]) {
  const workflow = getRecommendationWorkflow(workflowId);
  if (!workflow) return retrieved;

  return workflow.candidateIds.flatMap((productId, index) => {
    const existing = retrieved.find((candidate) => candidate.item.id === productId);
    const item = existing?.item ?? getCatalogItem(productId);
    if (!item) return [];

    return [
      {
        item,
        similarityScore: existing?.similarityScore ?? Number((0.98 - index * 0.015).toFixed(3)),
      },
    ];
  });
}

async function runPipeline(request: RecommendationRequest, runMode: RunMode): Promise<RecommendResponse> {
  const startedAt = new Date();
  const startedMs = Date.now();
  const requestId = `style-${crypto.randomUUID()}`;
  const intent =
    runMode === "live"
      ? await analyzeInputLive(request)
      : analyzeInputDemo({
          query: request.query,
          inputMode: request.inputMode,
          selectedSampleId: request.selectedSampleId,
        });
  const rawRetrieved: RetrievedCandidate[] =
    runMode === "live" ? await retrieveMatchesLive(intent) : await retrieveMatchesDemo(intent);
  const retrieved = runMode === "demo" ? workflowCandidates(request.workflowId, rawRetrieved) : rawRetrieved;
  const candidateIds = retrieved.slice(0, 16).map((candidate) => candidate.item.id);
  const inventoryTool =
    runMode === "live"
      ? await executeInventoryToolLive({
          productIds: candidateIds,
          size: intent.size,
        })
      : executeInventoryToolDemo(candidateIds, intent.size);
  const inventoryById = new Map(inventoryTool.results.map((result) => [result.productId, result]));
  const guardrails =
    runMode === "live"
      ? await guardrailCheckLive(
          intent,
          retrieved.slice(0, 16).map((candidate) => candidate.item),
        )
      : retrieved.slice(0, 16).map((candidate) => guardrailCheckDemo(intent, candidate.item));

  const cards = retrieved.slice(0, 16).map((candidate, index): RecommendationCard => {
    const inventoryResult =
      inventoryById.get(candidate.item.id) ??
      ({
        productId: candidate.item.id,
        status: "not_ranged",
        inventory: null,
        location: null,
        reason: "Not stocked at this store in the demo inventory.",
      } satisfies InventoryToolResult);
    const evaluatedGuardrail =
      guardrails[index] ?? ({ accepted: false, reason: "No guardrail result." } satisfies GuardrailResult);
    const isSelectedCatalogueImage =
      request.inputMode === "photo" &&
      Boolean(request.selectedSampleId) &&
      candidate.item.id === request.selectedSampleId;
    const guardrail = isSelectedCatalogueImage
      ? {
          accepted: true,
          reason: "Accepted: this product is the catalogue item shown in the selected source image.",
        }
      : evaluatedGuardrail;

    return {
      product: toCatalogCard(candidate.item),
      similarityScore: Number(candidate.similarityScore.toFixed(3)),
      guardrail,
      inventory: inventoryResult.inventory as InventoryRecord | null,
      location: inventoryResult.location as StoreLocationRecord | null,
      inventoryStatus: inventoryLabel(inventoryResult),
      whyThisMatches: buildWhy(candidate.item, inventoryResult, intent.occasion),
      rankingReason: guardrail.accepted
        ? "Matched + inventory availability + inventory health priority. Business-aware ranking is applied only after relevance."
        : "Retrieved as evidence, then dropped by the quality guardrail.",
    };
  });

  const cardByProductId = new Map(cards.map((card) => [card.product.id, card]));
  const rankedCards = rankResults(cards);
  const recommendations = rankedCards
    .filter((card) => card.guardrail.accepted && card.inventoryStatus === "in_stock")
    .slice(0, 5);
  const partialMatches =
    recommendations.length > 0
      ? rankedCards
          .filter((card) => card.guardrail.accepted && card.inventoryStatus !== "in_stock")
          .slice(0, 4)
      : rankedCards
          .filter((card) => !recommendations.some((recommendation) => recommendation.product.id === card.product.id))
          .slice(0, 4)
          .map((card) => ({
            ...card,
            rankingReason:
              "Closest cross-sell option only. It is grounded in retrieval, inventory and guardrail evidence, but it is not presented as an exact match.",
          }));
  const foundRelevantMatch = rankedCards.some((card) => card.guardrail.accepted);
  const foundInStock = recommendations.length > 0;
  const demandRecord = createDemandRecord({
    request,
    recommendations,
    allCards: rankedCards,
    foundRelevantMatch,
    foundInStock,
  });
  const trace: TechnicalTrace = {
    requestId,
    startedAt: startedAt.toISOString(),
    durationMs: Date.now() - startedMs,
    mode: runMode,
    models: {
      intent: runMode === "live" ? (request.inputMode === "photo" ? VISION_MODEL : TEXT_MODEL) : "deterministic-parser",
      embedding: runMode === "live" ? EMBEDDING_MODEL : "sparse-token-cosine",
      guardrail: runMode === "live" ? TEXT_MODEL : "deterministic-policy",
    },
    retrievalStrategy:
      runMode === "live"
        ? "Dynamic hybrid retrieval: OpenAI text embedding (70%) + enriched catalogue text (30%)"
        : request.workflowId
          ? "Curated demo story candidates with deterministic scoring"
          : "Dynamic deterministic catalogue retrieval",
    retrievalQuery: buildRetrievalQuery(intent),
    candidateCount: retrieved.length,
    topProductDisplayNames: retrieved.slice(0, 5).map((candidate) => candidate.item.productDisplayName),
    toolCall: {
      name: "check_inventory_and_location",
      label: runMode === "live" ? "OpenAI tool call" : "simulated tool result",
      input: inventoryTool.args,
      output: {
        results: inventoryTool.results.slice(0, 8),
      },
    },
    guardrailReasons: rankedCards.slice(0, 8).map((card) => ({
      productDisplayName: card.product.productDisplayName,
      accepted: card.guardrail.accepted,
      reason: card.guardrail.reason,
    })),
    rankingAnnotation:
      "Ranking order: guardrail quality first, then Oak Street availability, then nearby-store availability, then inventory health and commercial priority.",
    retrievalEvidence: retrieved.slice(0, 5).map((candidate, index) => {
      const card = cardByProductId.get(candidate.item.id);
      return {
        productId: candidate.item.id,
        productDisplayName: candidate.item.productDisplayName,
        similarityScore: Number(candidate.similarityScore.toFixed(3)),
        imageSource: candidate.item.imageSource,
        inventoryStatus: card?.inventoryStatus ?? "not_ranged",
        guardrail: card?.guardrail ?? { accepted: false, reason: "Not evaluated." },
      };
    }),
    provenance: {
      aiInferred: [
        "occasion",
        "requested item types",
        "colour and style preferences",
        "gender, size, budget and urgency",
      ],
      systemVerified: [
        "catalogue product identity",
        ...(request.inputMode === "photo" && request.selectedSampleId
          ? ["selected catalogue image to product mapping"]
          : []),
        "price and available sizes",
        "store inventory and pickup availability",
        "floor, department, aisle and bay",
      ],
      businessCalculated: [
        "hybrid relevance score",
        "guardrail acceptance",
        "availability-aware ranking",
        "estimated missed revenue",
      ],
    },
  };

  return {
    mode: runMode,
    workflowId: request.workflowId ?? null,
    fallbackUsed: false,
    fallbackMessage: null,
    intent,
    recommendations,
    partialMatches,
    demandRecord: {
      ...demandRecord,
      occasion: intent.occasion,
      requestedItems: intent.items,
      gender: intent.gender,
      size: intent.size,
      budget: intent.budget,
      constraints: intent.styleConstraints,
      category: intent.category,
    },
    trace,
  };
}

export async function runRecommendationPipeline(request: RecommendationRequest): Promise<RecommendResponse> {
  if (request.mode === "demo") {
    return runPipeline(request, "demo");
  }

  if (!hasOpenAIKey()) {
    const response = await runPipeline({ ...request, mode: "demo" }, "demo");
    return {
      ...response,
      mode: "demo",
      fallbackUsed: true,
      fallbackMessage: "Live AI unavailable — showing simulated result.",
      demandRecord: {
        ...response.demandRecord,
        mode: "demo",
      },
    };
  }

  try {
    return await runPipeline(request, "live");
  } catch (error) {
    console.error("Live recommendation pipeline failed", error);
    const response = await runPipeline({ ...request, mode: "demo" }, "demo");
    return {
      ...response,
      mode: "demo",
      fallbackUsed: true,
      fallbackMessage: "Live AI unavailable — showing simulated result.",
      demandRecord: {
        ...response.demandRecord,
        mode: "demo",
      },
    };
  }
}
