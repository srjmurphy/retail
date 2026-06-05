import type { InputIntent } from "@/types/demo";
import { getCatalog } from "@/lib/catalog/enrichCatalog";
import type { CatalogItem } from "@/lib/catalog/types";
import {
  denseCosineSimilarity,
  embedQueryLive,
  loadPrecomputedEmbeddings,
  sparseCosineSimilarity,
} from "./embeddings";

export type RetrievedCandidate = {
  item: CatalogItem;
  similarityScore: number;
};

export function buildRetrievalQuery(intent: InputIntent) {
  return [
    intent.items.join(" "),
    intent.category,
    intent.gender,
    intent.occasion,
    intent.size,
    intent.budget ? `under $${intent.budget}` : "",
    intent.colours.join(" "),
    intent.styleConstraints.join(" "),
    intent.urgency,
  ]
    .filter(Boolean)
    .join(" ");
}

function boostedScore(intent: InputIntent, item: CatalogItem, baseScore: number) {
  let score = baseScore;
  const gender = intent.gender.toLowerCase();
  const searchText = item.searchText.toLowerCase();

  if (gender !== "any" && item.gender.toLowerCase() === gender) score += 0.08;
  if (item.occasionTags.some((tag) => tag.toLowerCase().includes(intent.occasion.toLowerCase()))) score += 0.12;
  if (intent.colours.some((colour) => searchText.includes(colour.toLowerCase()))) score += 0.06;
  if (intent.budget && item.price <= intent.budget) score += 0.04;
  if (intent.items.some((itemName) => searchText.includes(itemName.toLowerCase()))) score += 0.06;

  return Math.min(score, 1);
}

function diversifyCandidates(candidates: RetrievedCandidate[], limit: number) {
  const selected: RetrievedCandidate[] = [];
  const selectedIds = new Set<string>();
  const usedArticleTypes = new Set<string>();

  for (const candidate of candidates) {
    const key = candidate.item.articleType.toLowerCase();
    if (usedArticleTypes.has(key)) continue;
    selected.push(candidate);
    selectedIds.add(candidate.item.id);
    usedArticleTypes.add(key);
    if (selected.length >= Math.min(10, limit)) break;
  }

  for (const candidate of candidates) {
    if (selectedIds.has(candidate.item.id)) continue;
    selected.push(candidate);
    if (selected.length >= limit) break;
  }

  return selected;
}

export async function retrieveMatchesDemo(intent: InputIntent, limit = 24) {
  const query = buildRetrievalQuery(intent);

  const ranked = getCatalog()
    .map((item) => ({
      item,
      similarityScore: boostedScore(intent, item, sparseCosineSimilarity(query, item.searchText)),
    }))
    .sort((left, right) => right.similarityScore - left.similarityScore);

  return diversifyCandidates(ranked, limit);
}

export async function retrieveMatchesLive(intent: InputIntent, limit = 24) {
  const query = buildRetrievalQuery(intent);
  const queryEmbedding = await embedQueryLive(query);
  const precomputed = loadPrecomputedEmbeddings();

  const ranked = getCatalog()
    .map((item) => {
      const cookbookEmbedding = precomputed.get(item.id);
      const denseScore = cookbookEmbedding ? denseCosineSimilarity(queryEmbedding, cookbookEmbedding) : 0;
      const enrichedTextScore = sparseCosineSimilarity(query, item.searchText);

      return {
        item,
        similarityScore: boostedScore(intent, item, denseScore * 0.7 + enrichedTextScore * 0.3),
      };
    })
    .sort((left, right) => right.similarityScore - left.similarityScore);

  return diversifyCandidates(ranked, limit);
}
