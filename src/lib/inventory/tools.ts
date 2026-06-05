import type { InventoryRecord, StoreLocationRecord } from "@/types/demo";
import { STORE_LOCATIONS } from "@/lib/store-route/locations";
import { getCatalogItem } from "@/lib/catalog/enrichCatalog";
import type { InventoryToolResult } from "./types";

const INVENTORY: InventoryRecord[] = [
  {
    productId: "27152",
    storeId: "oak-street",
    storeName: "RetailNext Oak Street",
    city: "Chicago",
    size: "42",
    stockCount: 6,
    pickupAvailability: "Available for fitting-room prep in 20 minutes",
    lastUpdated: "2026-06-05T09:15:00Z",
    price: 89,
  },
  {
    productId: "18197",
    storeId: "oak-street",
    storeName: "RetailNext Oak Street",
    city: "Chicago",
    size: "42",
    stockCount: 4,
    pickupAvailability: "Available for associate pickup",
    lastUpdated: "2026-06-05T09:20:00Z",
    price: 118,
  },
  {
    productId: "45595",
    storeId: "oak-street",
    storeName: "RetailNext Oak Street",
    city: "Chicago",
    size: "42",
    stockCount: 5,
    pickupAvailability: "Available for fitting-room prep in 15 minutes",
    lastUpdated: "2026-06-05T09:18:00Z",
    price: 126,
  },
  {
    productId: "14713",
    storeId: "oak-street",
    storeName: "RetailNext Oak Street",
    city: "Chicago",
    size: "42",
    stockCount: 3,
    pickupAvailability: "Available for fitting-room prep in 20 minutes",
    lastUpdated: "2026-06-05T09:19:00Z",
    price: 112,
  },
  {
    productId: "49696",
    storeId: "oak-street",
    storeName: "RetailNext Oak Street",
    city: "Chicago",
    size: "One Size",
    stockCount: 12,
    pickupAvailability: "Available at accessories counter",
    lastUpdated: "2026-06-05T09:22:00Z",
    price: 42,
  },
  {
    productId: "16035",
    storeId: "oak-street",
    storeName: "RetailNext Oak Street",
    city: "Chicago",
    size: "M",
    stockCount: 7,
    pickupAvailability: "Available for associate pickup",
    lastUpdated: "2026-06-05T09:17:00Z",
    price: 72,
  },
  {
    productId: "38974",
    storeId: "oak-street",
    storeName: "RetailNext Oak Street",
    city: "Chicago",
    size: "M",
    stockCount: 3,
    pickupAvailability: "Available for fitting-room prep in 25 minutes",
    lastUpdated: "2026-06-05T09:16:00Z",
    price: 94,
  },
  {
    productId: "48481",
    storeId: "oak-street",
    storeName: "RetailNext Oak Street",
    city: "Chicago",
    size: "10",
    stockCount: 5,
    pickupAvailability: "Available for fitting-room prep in 20 minutes",
    lastUpdated: "2026-06-05T09:14:00Z",
    price: 229,
  },
  {
    productId: "59982",
    storeId: "oak-street",
    storeName: "RetailNext Oak Street",
    city: "Chicago",
    size: "10",
    stockCount: 2,
    pickupAvailability: "Available for associate pickup",
    lastUpdated: "2026-06-05T09:12:00Z",
    price: 218,
  },
  {
    productId: "57993",
    storeId: "oak-street",
    storeName: "RetailNext Oak Street",
    city: "Chicago",
    size: "10",
    stockCount: 4,
    pickupAvailability: "Available for fitting-room prep in 20 minutes",
    lastUpdated: "2026-06-05T09:10:00Z",
    price: 188,
  },
  {
    productId: "59973",
    storeId: "oak-street",
    storeName: "RetailNext Oak Street",
    city: "Chicago",
    size: "12",
    stockCount: 1,
    pickupAvailability: "Available for associate pickup",
    lastUpdated: "2026-06-05T09:11:00Z",
    price: 238,
  },
  {
    productId: "34586",
    storeId: "oak-street",
    storeName: "RetailNext Oak Street",
    city: "Chicago",
    size: "12",
    stockCount: 4,
    pickupAvailability: "Available for fitting-room prep in 20 minutes",
    lastUpdated: "2026-06-05T09:13:00Z",
    price: 206,
  },
  {
    productId: "47548",
    storeId: "oak-street",
    storeName: "RetailNext Oak Street",
    city: "Chicago",
    size: "8",
    stockCount: 6,
    pickupAvailability: "Available for associate pickup",
    lastUpdated: "2026-06-05T09:09:00Z",
    price: 96,
  },
  {
    productId: "10616",
    storeId: "oak-street",
    storeName: "RetailNext Oak Street",
    city: "Chicago",
    size: "8",
    stockCount: 5,
    pickupAvailability: "Available for associate pickup",
    lastUpdated: "2026-06-05T09:08:00Z",
    price: 74,
  },
  {
    productId: "32379",
    storeId: "oak-street",
    storeName: "RetailNext Oak Street",
    city: "Chicago",
    size: "12",
    stockCount: 3,
    pickupAvailability: "Available for fitting-room prep in 20 minutes",
    lastUpdated: "2026-06-05T09:07:00Z",
    price: 174,
  },
  {
    productId: "57139",
    storeId: "oak-street",
    storeName: "RetailNext Oak Street",
    city: "Chicago",
    size: "10",
    stockCount: 2,
    pickupAvailability: "Available for associate pickup",
    lastUpdated: "2026-06-05T09:06:00Z",
    price: 118,
  },
  {
    productId: "27917",
    storeId: "oak-street",
    storeName: "RetailNext Oak Street",
    city: "Chicago",
    size: "10",
    stockCount: 2,
    pickupAvailability: "Available for associate pickup",
    lastUpdated: "2026-06-05T09:05:00Z",
    price: 124,
  },
];

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

export function checkInventoryAndLocation({
  productIds,
  size,
  storeId = "oak-street",
}: {
  productIds: string[];
  size: string;
  storeId?: string;
}): InventoryToolResult[] {
  return productIds.map((productId) => {
    const catalogItem = getCatalogItem(productId);
    const matchingInventory =
      INVENTORY.find(
        (record) =>
          record.productId === productId &&
          record.storeId === storeId &&
          sizeMatches(size, record.size) &&
          record.stockCount > 0,
      ) ?? null;

    if (matchingInventory) {
      const location = findLocation(productId, storeId);
      return {
        productId,
        status: location ? "in_stock" : "not_ranged",
        inventory: matchingInventory,
        location,
        reason: location
          ? "Inventory and in-store route found in deterministic RetailNext mock data."
          : "Inventory exists but no in-store location record is available, so locate action is suppressed.",
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
        reason: "Available online only in deterministic RetailNext mock data.",
      };
    }

    if (hasAnyInventory) {
      return {
        productId,
        status: "out_of_stock",
        inventory: null,
        location: null,
        reason: `No stock for requested size ${size || "Any"} at RetailNext Oak Street.`,
      };
    }

    return {
      productId,
      status: "not_ranged",
      inventory: null,
      location: null,
      reason: "Not ranged at this store in deterministic RetailNext mock data.",
    };
  });
}

export function getInventoryRecords() {
  return INVENTORY;
}
