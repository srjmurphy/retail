import type { InventoryRecord, StoreLocationRecord } from "@/types/demo";
import { STORE_LOCATIONS } from "@/lib/store-route/locations";
import { getStoreProfile } from "@/lib/store-route/stores";
import { getCatalogItem } from "@/lib/catalog/enrichCatalog";
import type { InventoryToolResult } from "./types";

const PRODUCT_PRICES: Record<string, number> = {
  "27152": 89,
  "18197": 118,
  "14713": 112,
  "45595": 126,
  "49696": 42,
  "16035": 72,
  "38974": 94,
  "48481": 229,
  "46216": 182,
  "59982": 218,
  "57993": 188,
  "59973": 238,
  "34586": 206,
  "47548": 96,
  "10616": 74,
  "35788": 92,
  "33981": 28,
  "32379": 174,
  "57139": 118,
  "27917": 124,
};

type StockSeed = {
  productId: string;
  storeId: string;
  size: string;
  stockCount: number;
  pickupAvailability?: string;
  lastUpdated?: string;
};

const STOCK_SEEDS: StockSeed[] = [
  { productId: "27152", storeId: "oak-street", size: "40", stockCount: 4 },
  { productId: "27152", storeId: "oak-street", size: "42", stockCount: 6 },
  { productId: "27152", storeId: "oak-street", size: "L", stockCount: 3 },
  { productId: "18197", storeId: "oak-street", size: "34", stockCount: 3 },
  { productId: "18197", storeId: "oak-street", size: "36", stockCount: 2 },
  { productId: "18197", storeId: "oak-street", size: "42", stockCount: 4 },
  { productId: "14713", storeId: "oak-street", size: "34", stockCount: 4 },
  { productId: "14713", storeId: "oak-street", size: "42", stockCount: 3 },
  { productId: "45595", storeId: "oak-street", size: "9", stockCount: 4 },
  { productId: "45595", storeId: "oak-street", size: "10", stockCount: 5 },
  { productId: "45595", storeId: "oak-street", size: "42", stockCount: 5 },
  { productId: "49696", storeId: "oak-street", size: "One Size", stockCount: 12, pickupAvailability: "Available at accessories counter" },
  { productId: "16035", storeId: "oak-street", size: "M", stockCount: 7 },
  { productId: "16035", storeId: "oak-street", size: "L", stockCount: 4 },
  { productId: "38974", storeId: "oak-street", size: "M", stockCount: 3 },
  { productId: "38974", storeId: "oak-street", size: "L", stockCount: 2 },
  { productId: "48481", storeId: "oak-street", size: "8", stockCount: 3 },
  { productId: "48481", storeId: "oak-street", size: "10", stockCount: 5 },
  { productId: "59982", storeId: "oak-street", size: "10", stockCount: 2 },
  { productId: "59982", storeId: "oak-street", size: "12", stockCount: 2 },
  { productId: "57993", storeId: "oak-street", size: "8", stockCount: 3 },
  { productId: "57993", storeId: "oak-street", size: "10", stockCount: 4 },
  { productId: "59973", storeId: "oak-street", size: "12", stockCount: 1 },
  { productId: "34586", storeId: "oak-street", size: "10", stockCount: 3 },
  { productId: "34586", storeId: "oak-street", size: "12", stockCount: 4 },
  { productId: "47548", storeId: "oak-street", size: "7", stockCount: 3 },
  { productId: "47548", storeId: "oak-street", size: "8", stockCount: 6 },
  { productId: "10616", storeId: "oak-street", size: "7", stockCount: 4 },
  { productId: "10616", storeId: "oak-street", size: "8", stockCount: 5 },
  { productId: "35788", storeId: "oak-street", size: "7", stockCount: 5 },
  { productId: "35788", storeId: "oak-street", size: "8", stockCount: 4 },
  { productId: "33981", storeId: "oak-street", size: "One Size", stockCount: 9, pickupAvailability: "Available from the occasion accessories fixture" },
  { productId: "32379", storeId: "oak-street", size: "10", stockCount: 2 },
  { productId: "32379", storeId: "oak-street", size: "12", stockCount: 3 },
  { productId: "57139", storeId: "oak-street", size: "10", stockCount: 2 },
  { productId: "57139", storeId: "oak-street", size: "12", stockCount: 3 },
  { productId: "27917", storeId: "oak-street", size: "10", stockCount: 2 },
  { productId: "27917", storeId: "oak-street", size: "12", stockCount: 1 },

  { productId: "46216", storeId: "river-north", size: "6", stockCount: 5, pickupAvailability: "Reserve for pickup in 45 minutes or transfer to Oak Street today" },
  { productId: "46216", storeId: "river-north", size: "8", stockCount: 4, pickupAvailability: "Reserve for pickup in 45 minutes or transfer to Oak Street today" },
  { productId: "57139", storeId: "river-north", size: "6", stockCount: 3 },
  { productId: "57139", storeId: "river-north", size: "8", stockCount: 6 },
  { productId: "27917", storeId: "river-north", size: "6", stockCount: 4 },
  { productId: "27917", storeId: "river-north", size: "8", stockCount: 5 },
  { productId: "48481", storeId: "river-north", size: "6", stockCount: 2 },
  { productId: "48481", storeId: "river-north", size: "8", stockCount: 4 },
  { productId: "59982", storeId: "river-north", size: "8", stockCount: 3 },
  { productId: "59982", storeId: "river-north", size: "10", stockCount: 2 },
  { productId: "59973", storeId: "river-north", size: "10", stockCount: 3 },
  { productId: "34586", storeId: "river-north", size: "8", stockCount: 5 },
  { productId: "47548", storeId: "river-north", size: "6", stockCount: 5 },
  { productId: "47548", storeId: "river-north", size: "8", stockCount: 4 },
  { productId: "10616", storeId: "river-north", size: "6", stockCount: 4 },
  { productId: "10616", storeId: "river-north", size: "8", stockCount: 6 },
  { productId: "35788", storeId: "river-north", size: "8", stockCount: 3 },
  { productId: "33981", storeId: "river-north", size: "One Size", stockCount: 7 },
  { productId: "32379", storeId: "river-north", size: "8", stockCount: 3 },
  { productId: "27152", storeId: "river-north", size: "38", stockCount: 5 },
  { productId: "27152", storeId: "river-north", size: "42", stockCount: 3 },
  { productId: "18197", storeId: "river-north", size: "32", stockCount: 4 },
  { productId: "18197", storeId: "river-north", size: "34", stockCount: 3 },
  { productId: "14713", storeId: "river-north", size: "34", stockCount: 4 },
  { productId: "45595", storeId: "river-north", size: "8", stockCount: 4 },
  { productId: "45595", storeId: "river-north", size: "9", stockCount: 5 },
  { productId: "49696", storeId: "river-north", size: "One Size", stockCount: 10, pickupAvailability: "Available at accessories counter" },
  { productId: "16035", storeId: "river-north", size: "S", stockCount: 4 },
  { productId: "16035", storeId: "river-north", size: "M", stockCount: 6 },
  { productId: "38974", storeId: "river-north", size: "M", stockCount: 3 },

  { productId: "46216", storeId: "lincoln-park", size: "6", stockCount: 3, pickupAvailability: "Reserve for pickup in 90 minutes or transfer to Oak Street tomorrow" },
  { productId: "46216", storeId: "lincoln-park", size: "10", stockCount: 4, pickupAvailability: "Reserve for pickup in 90 minutes or transfer to Oak Street tomorrow" },
  { productId: "57139", storeId: "lincoln-park", size: "8", stockCount: 4 },
  { productId: "57139", storeId: "lincoln-park", size: "10", stockCount: 5 },
  { productId: "27917", storeId: "lincoln-park", size: "8", stockCount: 3 },
  { productId: "27917", storeId: "lincoln-park", size: "10", stockCount: 4 },
  { productId: "48481", storeId: "lincoln-park", size: "8", stockCount: 3 },
  { productId: "48481", storeId: "lincoln-park", size: "10", stockCount: 2 },
  { productId: "59982", storeId: "lincoln-park", size: "10", stockCount: 4 },
  { productId: "57993", storeId: "lincoln-park", size: "8", stockCount: 5 },
  { productId: "57993", storeId: "lincoln-park", size: "10", stockCount: 4 },
  { productId: "59973", storeId: "lincoln-park", size: "8", stockCount: 3 },
  { productId: "34586", storeId: "lincoln-park", size: "10", stockCount: 4 },
  { productId: "47548", storeId: "lincoln-park", size: "7", stockCount: 5 },
  { productId: "10616", storeId: "lincoln-park", size: "7", stockCount: 5 },
  { productId: "35788", storeId: "lincoln-park", size: "7", stockCount: 4 },
  { productId: "33981", storeId: "lincoln-park", size: "One Size", stockCount: 6 },
  { productId: "32379", storeId: "lincoln-park", size: "8", stockCount: 4 },
  { productId: "27152", storeId: "lincoln-park", size: "40", stockCount: 4 },
  { productId: "18197", storeId: "lincoln-park", size: "34", stockCount: 4 },
  { productId: "14713", storeId: "lincoln-park", size: "36", stockCount: 3 },
  { productId: "45595", storeId: "lincoln-park", size: "10", stockCount: 4 },
  { productId: "49696", storeId: "lincoln-park", size: "One Size", stockCount: 8, pickupAvailability: "Available at accessories counter" },
  { productId: "16035", storeId: "lincoln-park", size: "M", stockCount: 5 },
  { productId: "38974", storeId: "lincoln-park", size: "L", stockCount: 4 },
];

const INVENTORY: InventoryRecord[] = STOCK_SEEDS.map((seed) => {
  const store = getStoreProfile(seed.storeId);

  if (!store) {
    throw new Error(`Unknown deterministic store id: ${seed.storeId}`);
  }

  return {
    productId: seed.productId,
    storeId: seed.storeId,
    storeName: store.storeName,
    city: store.city,
    size: seed.size,
    stockCount: seed.stockCount,
    pickupAvailability: seed.pickupAvailability ?? store.transferAvailability,
    lastUpdated: seed.lastUpdated ?? "2026-06-05T09:30:00Z",
    price: PRODUCT_PRICES[seed.productId],
  };
});

function normalizeSize(size: string) {
  return size.trim().toLowerCase();
}

function sizeMatches(requestedSize: string, recordSize: string) {
  if (!requestedSize || requestedSize === "Any") return true;
  const requested = normalizeSize(requestedSize);
  const available = normalizeSize(recordSize);

  return requested === available || available === "one size";
}

function findLocation(productId: string, storeId: string): StoreLocationRecord | null {
  return STORE_LOCATIONS.find((location) => location.productId === productId && location.storeId === storeId) ?? null;
}

function findInventory(productId: string, size: string, storeId: string) {
  return (
    INVENTORY.find(
      (record) =>
        record.productId === productId &&
        record.storeId === storeId &&
        sizeMatches(size, record.size) &&
        record.stockCount > 0,
    ) ?? null
  );
}

function findNearbyInventory(productId: string, size: string, requestedStoreId: string) {
  return (
    INVENTORY.find(
      (record) =>
        record.productId === productId &&
        record.storeId !== requestedStoreId &&
        sizeMatches(size, record.size) &&
        record.stockCount > 0 &&
        findLocation(productId, record.storeId),
    ) ?? null
  );
}

export function checkInventoryAndLocation({
  productIds,
  size,
  storeId = "oak-street",
}: {
  productIds: string[];
  size: string;
  storeId?: string;
}): InventoryToolResult[] {
  const requestedStore = getStoreProfile(storeId);
  const requestedStoreName = requestedStore?.storeName ?? storeId;

  return productIds.map((productId) => {
    const catalogItem = getCatalogItem(productId);
    const matchingInventory = findInventory(productId, size, storeId);

    if (matchingInventory) {
      const location = findLocation(productId, storeId);
      return {
        productId,
        status: location ? "in_stock" : "not_ranged",
        inventory: matchingInventory,
        location,
        reason: location
          ? "Inventory and in-store route found in the demo network."
          : "Inventory exists but no in-store location record is available, so locate action is suppressed.",
      };
    }

    const nearbyInventory = findNearbyInventory(productId, size, storeId);

    if (nearbyInventory) {
      const location = findLocation(productId, nearbyInventory.storeId);

      return {
        productId,
        status: "nearby_store",
        inventory: nearbyInventory,
        location,
        reason: `No matching stock at ${requestedStoreName}; requested size is available at ${nearbyInventory.storeName}.`,
      };
    }

    const hasAnyInventory = INVENTORY.some((record) => record.productId === productId && record.storeId === storeId);
    const onlineOnly = catalogItem?.storeAvailability === "Online only";

    if (onlineOnly) {
      return {
        productId,
        status: "online_only",
        inventory: null,
        location: null,
        reason: "Available online only in the demo network.",
      };
    }

    if (hasAnyInventory) {
      return {
        productId,
        status: "out_of_stock",
        inventory: null,
        location: null,
        reason: `No stock for requested size ${size || "Any"} at ${requestedStoreName}.`,
      };
    }

    return {
      productId,
      status: "not_ranged",
      inventory: null,
      location: null,
      reason: "Not stocked at this store in the demo network.",
    };
  });
}

export function getInventoryRecords() {
  return INVENTORY;
}
