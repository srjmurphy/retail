import type { DemandRecord } from "@/types/demo";

export type TrendInput = {
  prompt: string;
  threshold: number;
  demandRecords: DemandRecord[];
};

export type TrendToolName =
  | "analyze_customer_intents"
  | "inspect_inventory_gaps"
  | "summarize_substitution_trends"
  | "inspect_store_location_failures"
  | "compare_competitor_signal"
  | "recommend_business_actions";
