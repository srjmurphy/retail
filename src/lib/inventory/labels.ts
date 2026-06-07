import type { RecommendationCard } from "@/types/demo";

export function inventoryStatusLabel(status: RecommendationCard["inventoryStatus"]) {
  if (status === "in_stock") return "In stock at this store";
  if (status === "nearby_store") return "Available at another store";
  if (status === "out_of_stock") return "Not available in requested size";
  if (status === "online_only") return "Available online only";
  return "Not stocked at this store";
}

export function inventoryNextStep(status: RecommendationCard["inventoryStatus"]) {
  if (status === "in_stock") return "Locate item and prepare fitting room.";
  if (status === "nearby_store") return "Ask store assistant to reserve, transfer, or route the customer to the nearby store.";
  if (status === "out_of_stock") return "Ask store assistant to check nearby stores or offer a stocked substitute.";
  if (status === "online_only") return "Ask store assistant to order online or ship to customer.";
  return "Ask store assistant to check online, nearby stores, or prepare the closest substitute.";
}
