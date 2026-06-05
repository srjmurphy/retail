import type { InventoryRecord, StoreLocationRecord } from "@/types/demo";

export type { InventoryRecord, StoreLocationRecord };

export type InventoryToolResult = {
  productId: string;
  status: "in_stock" | "out_of_stock" | "online_only" | "not_ranged";
  inventory: InventoryRecord | null;
  location: StoreLocationRecord | null;
  reason: string;
};
