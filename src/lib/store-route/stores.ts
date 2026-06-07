export type StoreProfile = {
  storeId: string;
  storeName: string;
  city: string;
  entryInstruction: string;
  transferAvailability: string;
  distanceLabel: string;
};

export const RETAIL_STORES: StoreProfile[] = [
  {
    storeId: "oak-street",
    storeName: "RetailNext Oak Street",
    city: "Chicago",
    entryInstruction: "Enter through the main entrance on Ground Floor",
    transferAvailability: "Available for fitting-room prep in 20 minutes",
    distanceLabel: "current store",
  },
  {
    storeId: "river-north",
    storeName: "RetailNext River North",
    city: "Chicago",
    entryInstruction: "Enter through the Wabash Avenue doors",
    transferAvailability: "Reserve for pickup in 45 minutes or transfer to Oak Street today",
    distanceLabel: "1.4 mi from Oak Street",
  },
  {
    storeId: "lincoln-park",
    storeName: "RetailNext Lincoln Park",
    city: "Chicago",
    entryInstruction: "Enter through the North Avenue entrance",
    transferAvailability: "Reserve for pickup in 90 minutes or transfer to Oak Street tomorrow",
    distanceLabel: "3.8 mi from Oak Street",
  },
];

export function getStoreProfile(storeId: string) {
  return RETAIL_STORES.find((store) => store.storeId === storeId) ?? null;
}
