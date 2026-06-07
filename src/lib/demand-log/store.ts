import type { DemandRecord } from "@/types/demo";
import { combineDemandRecords } from "./summarize";

type DemandStore = Map<string, DemandRecord[]>;

const globalDemandStore = globalThis as typeof globalThis & {
  __retailNextDemandStore?: DemandStore;
};

function store() {
  if (!globalDemandStore.__retailNextDemandStore) {
    globalDemandStore.__retailNextDemandStore = new Map();
  }
  return globalDemandStore.__retailNextDemandStore;
}

export function getDemandRecords(sessionId: string) {
  return [...(store().get(sessionId) ?? [])];
}

export function appendDemandRecord(sessionId: string, record: DemandRecord) {
  const records = combineDemandRecords([...getDemandRecords(sessionId), record]).slice(-100);
  store().set(sessionId, records);
  return records;
}

export function clearDemandRecords(sessionId: string) {
  store().delete(sessionId);
}
