import type { GuardrailResult, InputIntent } from "@/types/demo";
import type { CatalogItem } from "@/lib/catalog/types";
import { getOpenAIClient } from "@/lib/openai/client";
import { TEXT_MODEL } from "@/lib/openai/models";
import { withTimeout } from "@/lib/openai/timeout";

export function guardrailCheckDemo(intent: InputIntent, item: CatalogItem): GuardrailResult {
  const searchText = item.searchText.toLowerCase();
  const gender = intent.gender.toLowerCase();
  const occasionFit =
    item.occasionTags.some((tag) => intent.occasion.toLowerCase().includes(tag.toLowerCase())) ||
    item.occasionTags.some((tag) => tag.toLowerCase().includes(intent.occasion.toLowerCase())) ||
    searchText.includes(intent.occasion.toLowerCase().split(" ")[0]);
  const itemFit =
    intent.items.some((requestedItem) => searchText.includes(requestedItem.toLowerCase())) ||
    intent.items.includes("outfit") ||
    intent.items.includes("formalwear");
  const genderFit = gender === "any" || item.gender.toLowerCase() === gender || item.gender.toLowerCase() === "unisex";
  const budgetFit = !intent.budget || item.price <= intent.budget;
  const plusSizeRequested = intent.styleConstraints.includes("plus-size") || intent.size === "18";
  const plusSizeFit =
    !plusSizeRequested ||
    (item.gender === "Women" &&
      item.available_sizes.some((size) => {
        const numericSize = Number(size);
        return /plus|1x|2x|3x/i.test(size) || (Number.isFinite(numericSize) && numericSize >= 16 && numericSize <= 30);
      }));

  if (!genderFit) {
    return { accepted: false, reason: `Dropped: ${item.gender} product does not fit requested ${intent.gender} context.` };
  }

  if (!budgetFit) {
    return { accepted: false, reason: `Dropped: $${item.price} exceeds the requested budget.` };
  }

  if (!plusSizeFit) {
    return { accepted: false, reason: "Dropped: no plus-size availability in deterministic size data." };
  }

  if (!occasionFit && !itemFit) {
    return { accepted: false, reason: "Dropped: weak occasion and item fit after cookbook retrieval." };
  }

  return {
    accepted: true,
    reason: occasionFit
      ? "Accepted: occasion, style and budget fit the shopper intent."
      : "Accepted as a useful partial match for the requested item category.",
  };
}

/*
 * VIDEO ANCHOR 11: SUITABILITY GUARDRAIL
 * - Retrieval is only candidate generation; it does not guarantee recommendation.
 * - Structured decisions cover direct matches and credible complete-look additions.
 * - Inventory and store facts remain outside the model's authority.
 */
export async function guardrailCheckLive(intent: InputIntent, items: CatalogItem[]) {
  const client = getOpenAIClient();

  // Production seam: this is where the real OpenAI call happens.
  const response = await withTimeout(
    client.chat.completions.create({
      model: TEXT_MODEL,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "recommendation_guardrail",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              results: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    productId: { type: "string" },
                    accepted: { type: "boolean" },
                    reason: { type: "string" },
                  },
                  required: ["productId", "accepted", "reason"],
                },
              },
            },
            required: ["results"],
          },
        },
      },
      messages: [
        {
          role: "system",
          content:
            "You are a retail styling guardrail. Judge whether each candidate is either a strong visual/category match or a credible complementary item for a complete outfit. Shoes, heels, trousers, ties, hosiery and accessories should not be rejected merely because they differ from the anchor garment; accept them when they suit the shopper's gender, occasion, palette, size and budget. Do not invent inventory or store facts. Return JSON: { results: [{ productId, accepted, reason }] }.",
        },
        {
          role: "user",
          content: JSON.stringify({
            intent,
            recommendationGoal: "Build a complete shoppable look around the requested or photographed anchor item.",
            candidates: items.map((item) => ({
              productId: item.id,
              productDisplayName: item.productDisplayName,
              articleType: item.articleType,
              gender: item.gender,
              baseColour: item.baseColour,
              occasionTags: item.occasionTags,
              styleTags: item.styleTags,
              price: item.price,
              available_sizes: item.available_sizes,
            })),
          }),
        },
      ],
    }),
  );

  const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}") as {
    results?: { productId: string; accepted: boolean; reason: string }[];
  };
  const results = new Map<string, GuardrailResult>();

  for (const result of parsed.results ?? []) {
    results.set(result.productId, {
      accepted: Boolean(result.accepted),
      reason: result.reason || "Guardrail completed without detailed reason.",
    });
  }

  return items.map((item) => results.get(item.id) ?? guardrailCheckDemo(intent, item));
}
