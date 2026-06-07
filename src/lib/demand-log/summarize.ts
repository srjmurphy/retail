import type { DemandRecord } from "@/types/demo";

export function combineDemandRecords(liveDemand: DemandRecord[]) {
  const seen = new Set<string>();
  return liveDemand.filter((record) => {
    if (seen.has(record.id)) return false;
    seen.add(record.id);
    return true;
  });
}

export function sumMissedRevenue(records: DemandRecord[]) {
  return records.reduce((sum, record) => sum + (record.foundInStock ? 0 : record.estimatedLostRevenue), 0);
}

export function countBy(records: DemandRecord[], key: keyof DemandRecord) {
  return records.reduce<Record<string, number>>((counts, record) => {
    const value = String(record[key] ?? "unknown");
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}
