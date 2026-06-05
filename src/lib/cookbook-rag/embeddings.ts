import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { getOpenAIClient } from "@/lib/openai/client";
import { EMBEDDING_MODEL } from "@/lib/openai/models";
import { withTimeout } from "@/lib/openai/timeout";

const embeddingCsvPath = path.join(
  process.cwd(),
  "data",
  "sample_clothes",
  "sample_styles_with_embeddings.csv",
);

let precomputedEmbeddings: Map<string, number[]> | null = null;

const synonymGroups = [
  ["wedding", "occasionwear", "formal", "ceremony"],
  ["gala", "evening", "formal", "dress"],
  ["interview", "workwear", "formal", "smart"],
  ["holiday", "party", "evening"],
  ["graduation", "ceremony", "comfortable"],
  ["navy", "blue"],
  ["bag", "accessory", "accessories"],
  ["shoes", "footwear", "heels"],
  ["mens", "men", "menswear"],
  ["womens", "women", "womenswear"],
];

function expandToken(token: string) {
  const group = synonymGroups.find((tokens) => tokens.includes(token));
  return group ?? [token];
}

export function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((token) => expandToken(token));
}

function sparseVector(text: string) {
  const vector = new Map<string, number>();
  for (const token of tokenize(text)) {
    vector.set(token, (vector.get(token) ?? 0) + 1);
  }
  return vector;
}

export function sparseCosineSimilarity(leftText: string, rightText: string) {
  const left = sparseVector(leftText);
  const right = sparseVector(rightText);
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (const value of left.values()) leftMagnitude += value * value;
  for (const value of right.values()) rightMagnitude += value * value;

  for (const [token, value] of left.entries()) {
    dot += value * (right.get(token) ?? 0);
  }

  if (!leftMagnitude || !rightMagnitude) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

export function denseCosineSimilarity(left: number[], right: number[]) {
  if (left.length !== right.length) return 0;

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  if (!leftMagnitude || !rightMagnitude) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

export function loadPrecomputedEmbeddings() {
  if (precomputedEmbeddings) return precomputedEmbeddings;

  precomputedEmbeddings = new Map<string, number[]>();

  if (!existsSync(embeddingCsvPath)) {
    return precomputedEmbeddings;
  }

  const csv = readFileSync(embeddingCsvPath, "utf8");
  const [, ...lines] = csv.trim().split(/\r?\n/);

  for (const line of lines) {
    const firstComma = line.indexOf(",");
    const id = line.slice(0, firstComma);
    const embeddingStart = line.indexOf(',"[');
    const embeddingEnd = line.lastIndexOf(']"');

    if (!id || embeddingStart === -1 || embeddingEnd === -1) continue;

    const embeddingText = line.slice(embeddingStart + 2, embeddingEnd + 1);
    try {
      precomputedEmbeddings.set(id, JSON.parse(embeddingText) as number[]);
    } catch {
      // Ignore malformed optional embedding rows and keep retrieval available.
    }
  }

  return precomputedEmbeddings;
}

export async function embedQueryLive(text: string) {
  const client = getOpenAIClient();

  // Production seam: this is where the real OpenAI call happens.
  const response = await withTimeout(
    client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  );

  return response.data[0].embedding;
}
