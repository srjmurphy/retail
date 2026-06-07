export type AppTab = "recommend" | "locate" | "optimise";
export type InputMode = "text" | "photo";
export type RunMode = "demo" | "live";
export type ImageSource = "cookbook_sample" | "placeholder";
export type RecommendationWorkflowId = "happy_path" | "distributed_stock" | "unmet_demand";

export type InputIntent = {
  items: string[];
  category: string;
  gender: string;
  occasion: string;
  size: string;
  budget: number | null;
  colours: string[];
  styleConstraints: string[];
  store: string;
  urgency: string;
};

export type InventoryRecord = {
  productId: string;
  storeId: string;
  storeName: string;
  city: string;
  size: string;
  stockCount: number;
  pickupAvailability: string;
  lastUpdated: string;
  price: number;
};

export type StoreLocationRecord = {
  productId: string;
  storeId: string;
  floor: string;
  department: string;
  zone: string;
  aisle: string;
  bay: string;
  landmark: string;
  associateNote: string;
  routeSteps: string[];
};

export type CatalogCard = {
  id: string;
  productDisplayName: string;
  articleType: string;
  gender: string;
  masterCategory: string;
  subCategory: string;
  baseColour: string;
  usage: string;
  season: string;
  occasionTags: string[];
  styleTags: string[];
  price: number;
  priceBand: string;
  available_sizes: string[];
  inventory_health_score: number;
  commercial_priority_score: number;
  storeAvailability: string;
  imagePath: string;
  imageSource: ImageSource;
};

export type GuardrailResult = {
  accepted: boolean;
  reason: string;
};

export type RecommendationCard = {
  product: CatalogCard;
  similarityScore: number;
  guardrail: GuardrailResult;
  inventory: InventoryRecord | null;
  location: StoreLocationRecord | null;
  inventoryStatus: "in_stock" | "nearby_store" | "out_of_stock" | "online_only" | "not_ranged";
  whyThisMatches: string;
  rankingReason: string;
};

export type RetrievalEvidence = {
  productId: string;
  productDisplayName: string;
  similarityScore: number;
  imageSource: ImageSource;
  inventoryStatus: string;
  guardrail: GuardrailResult;
};

export type TechnicalTrace = {
  requestId: string;
  startedAt: string;
  durationMs: number;
  mode: RunMode;
  models: {
    intent: string;
    embedding: string;
    guardrail: string;
  };
  retrievalStrategy: string;
  retrievalQuery: string;
  candidateCount: number;
  topProductDisplayNames: string[];
  toolCall: {
    name: string;
    label: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
  };
  guardrailReasons: {
    productDisplayName: string;
    accepted: boolean;
    reason: string;
  }[];
  rankingAnnotation: string;
  retrievalEvidence: RetrievalEvidence[];
  provenance: {
    aiInferred: string[];
    systemVerified: string[];
    businessCalculated: string[];
  };
};

export type DemandRecord = {
  id: string;
  timestamp: string;
  query: string;
  inputMode: InputMode;
  mode: RunMode;
  occasion: string;
  requestedItems: string[];
  gender: string;
  size: string;
  budget: number | null;
  constraints: string[];
  foundRelevantMatch: boolean;
  foundInStock: boolean;
  selectedProductIds: string[];
  missedReason: string | null;
  estimatedLostRevenue: number;
  store: string;
  category: string;
  demandQualityScore: number;
  source: string;
};

export type RecommendResponse = {
  mode: RunMode;
  workflowId: RecommendationWorkflowId | null;
  fallbackUsed: boolean;
  fallbackMessage: string | null;
  intent: InputIntent;
  recommendations: RecommendationCard[];
  partialMatches: RecommendationCard[];
  demandRecord: DemandRecord;
  trace: TechnicalTrace;
};

export type TrendToolTrace = {
  name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  selectedBy?: "model" | "policy" | "demo";
  durationMs?: number;
};

export type BuySignal = {
  demandPattern: string;
  affectedStoreCategorySize: string;
  evidenceCount: number;
  estimatedMissedRevenue: number;
  recommendedAction: string;
  confidenceLevel: "High" | "Medium" | "Low";
  confidenceScore: number;
};

export type TrendToRackResult = {
  requestId: string;
  startedAt: string;
  durationMs: number;
  mode: RunMode;
  model: string;
  orchestration: "model_tool_loop" | "deterministic_demo" | "fallback_demo";
  fallbackUsed: boolean;
  fallbackMessage: string | null;
  executiveBrief: string;
  nextMove: string;
  buySignals: BuySignal[];
  demandSignals: string[];
  inventoryGaps: string[];
  findabilityGaps: string[];
  recommendedActions: string[];
  evidencePanel: string[];
  businessImpact: string[];
  trace: TrendToolTrace[];
};
