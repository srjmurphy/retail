import type { InputIntent, InputMode } from "@/types/demo";
import { getOpenAIClient } from "@/lib/openai/client";
import { TEXT_MODEL, VISION_MODEL } from "@/lib/openai/models";
import { withTimeout } from "@/lib/openai/timeout";

const defaultIntent: InputIntent = {
  items: ["outfit"],
  category: "occasionwear",
  gender: "Men",
  occasion: "outdoor wedding",
  size: "42",
  budget: 400,
  colours: ["navy"],
  styleConstraints: ["outdoor", "under budget"],
  store: "RetailNext Oak Street",
  urgency: "next weekend",
};

const photoSampleIntents: Record<string, InputIntent> = {
  "27152": {
    items: ["shirt", "outfit"],
    category: "mens formalwear",
    gender: "Men",
    occasion: "outdoor wedding",
    size: "42",
    budget: 400,
    colours: ["blue", "navy"],
    styleConstraints: ["tailored", "event-ready"],
    store: "RetailNext Oak Street",
    urgency: "this weekend",
  },
  "48481": {
    items: ["dress", "shoes"],
    category: "women occasionwear",
    gender: "Women",
    occasion: "work gala",
    size: "10",
    budget: 300,
    colours: ["black"],
    styleConstraints: ["formal", "evening"],
    store: "RetailNext Oak Street",
    urgency: "this Friday",
  },
  "10616": {
    items: ["shoes", "accessories"],
    category: "ceremony accessories",
    gender: "Women",
    occasion: "graduation",
    size: "8",
    budget: 200,
    colours: ["gold"],
    styleConstraints: ["comfortable", "ceremony"],
    store: "RetailNext Oak Street",
    urgency: "this weekend",
  },
};

function extractBudget(query: string) {
  const match = query.match(/(?:under|below|less than)\s*\$?(\d+)/i) ?? query.match(/\$(\d+)/);
  return match ? Number(match[1]) : null;
}

function extractSize(query: string) {
  if (/plus[-\s]?size/i.test(query)) return "18";

  const labelled = query.match(/size\s*([a-z]|\d{1,2})/i);
  if (labelled) return labelled[1].toUpperCase();

  const mensNumber = query.match(/\b(38|40|42|44|46)\b/);
  if (mensNumber) return mensNumber[1];

  const alpha = query.match(/\b(xs|s|m|l|xl)\b/i);
  if (alpha) return alpha[1].toUpperCase();

  return "Any";
}

function extractGender(query: string) {
  if (/\bwomen(?:['’]s)?\b|\bwoman(?:['’]s)?\b|\bfemale\b|\bdress\b|\bgala\b|plus[-\s]?size|formalwear/i.test(query)) {
    return "Women";
  }
  if (/\bmen(?:['’]s)?\b|\bman(?:['’]s)?\b|\bmale\b/i.test(query)) return "Men";
  return "Any";
}

function normalizeGender(gender: string) {
  const normalized = gender.trim().toLowerCase();

  if (["men", "man", "male", "mens", "men's"].includes(normalized)) return "Men";
  if (["women", "woman", "female", "womens", "women's"].includes(normalized)) return "Women";
  if (["any", "unisex", "unknown", "not specified"].includes(normalized)) return "Any";
  return gender;
}

function extractOccasion(query: string) {
  const lower = query.toLowerCase();

  if (lower.includes("winter wedding")) return "winter wedding";
  if (lower.includes("outdoor wedding") || lower.includes("wedding")) return "outdoor wedding";
  if (lower.includes("work gala") || lower.includes("gala")) return "work gala";
  if (lower.includes("interview")) return "interview";
  if (lower.includes("holiday") || lower.includes("party")) return "holiday party";
  if (lower.includes("graduation")) return "graduation";
  if (lower.includes("vacation") || lower.includes("resort")) return "vacation";
  if (lower.includes("work trip") || lower.includes("business trip")) return "work trip";
  return "occasionwear";
}

function extractItems(query: string, occasion: string) {
  const lower = query.toLowerCase();
  const items = new Set<string>();

  if (lower.includes("dress")) items.add("dress");
  if (lower.includes("shoe") || lower.includes("heels")) items.add("shoes");
  if (lower.includes("bag") || lower.includes("accessor")) items.add("accessories");
  if (lower.includes("shirt")) items.add("shirt");
  if (lower.includes("trouser") || lower.includes("pants")) items.add("trousers");
  if (lower.includes("tie")) items.add("tie");
  if (lower.includes("formalwear")) items.add("formalwear");
  if (lower.includes("coat") || lower.includes("jacket")) items.add("coat");
  if (lower.includes("outfit") || lower.includes("clothes")) items.add("outfit");

  if (items.size === 0) {
    if (occasion.includes("gala") || occasion.includes("party")) items.add("dress");
    else if (occasion.includes("interview")) items.add("shirt");
    else items.add("outfit");
  }

  return Array.from(items);
}

function extractColours(query: string) {
  const colours = ["navy", "blue", "black", "white", "brown", "gold", "beige", "green", "red", "cream", "pink"];
  return colours.filter((colour) => new RegExp(`\\b${colour}\\b`, "i").test(query));
}

function extractConstraints(query: string) {
  const constraints: string[] = [];
  const lower = query.toLowerCase();

  if (lower.includes("outdoor")) constraints.push("outdoor");
  if (lower.includes("comfortable")) constraints.push("comfortable");
  if (lower.includes("smart casual")) constraints.push("smart casual");
  if (lower.includes("plus-size") || lower.includes("plus size")) constraints.push("plus-size");
  if (lower.includes("formal")) constraints.push("formal");
  if (lower.includes("under")) constraints.push("under budget");

  return constraints;
}

function extractUrgency(query: string) {
  const lower = query.toLowerCase();

  if (lower.includes("tomorrow")) return "tomorrow";
  if (lower.includes("this friday")) return "this Friday";
  if (lower.includes("this weekend")) return "this weekend";
  if (lower.includes("next weekend")) return "next weekend";
  return "upcoming event";
}

export function analyzeInputDemo({
  query,
  inputMode,
  selectedSampleId,
}: {
  query: string;
  inputMode: InputMode;
  selectedSampleId?: string;
}) {
  if (inputMode === "photo" && selectedSampleId && photoSampleIntents[selectedSampleId]) {
    return photoSampleIntents[selectedSampleId];
  }

  const source = query.trim() || defaultIntent.occasion;
  const occasion = extractOccasion(source);
  const items = extractItems(source, occasion);
  const budget = extractBudget(source);
  const colours = extractColours(source);

  return {
    items,
    category: occasion.includes("interview")
      ? "workwear"
      : occasion.includes("work trip")
        ? "outerwear"
      : occasion.includes("graduation")
        ? "ceremonywear"
        : occasion.includes("vacation")
          ? "resortwear"
          : "occasionwear",
    gender: extractGender(source),
    occasion,
    size: extractSize(source),
    budget,
    colours,
    styleConstraints: extractConstraints(source),
    store: "RetailNext Oak Street",
    urgency: extractUrgency(source),
  };
}

/*
 * VIDEO ANCHOR 02: MULTIMODAL INTENT
 * - A vision-capable model receives the image and optional customer context.
 * - Strict JSON Schema turns model output into predictable application data.
 * - Unknown occasion, size and budget stay unknown; stock facts are never inferred.
 */
export async function analyzeInputLive({
  query,
  inputMode,
  imageDataUrl,
}: {
  query: string;
  inputMode: InputMode;
  imageDataUrl?: string;
}) {
  const client = getOpenAIClient();
  const schemaInstruction =
    "Return strict JSON with items, category, gender, occasion, size, budget, colours, styleConstraints, store, urgency. Use RetailNext Oak Street when the store is unspecified.";

  // Production seam: this is where the real OpenAI call happens.
  const response = await withTimeout(
    client.chat.completions.create({
      model: inputMode === "photo" ? VISION_MODEL : TEXT_MODEL,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "retail_intent",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              items: { type: "array", items: { type: "string" } },
              category: { type: "string" },
              gender: { type: "string" },
              occasion: { type: "string" },
              size: { type: "string" },
              budget: { type: ["number", "null"] },
              colours: { type: "array", items: { type: "string" } },
              styleConstraints: { type: "array", items: { type: "string" } },
              store: { type: "string" },
              urgency: { type: "string" },
            },
            required: [
              "items",
              "category",
              "gender",
              "occasion",
              "size",
              "budget",
              "colours",
              "styleConstraints",
              "store",
              "urgency",
            ],
          },
        },
      },
      messages: [
        {
          role: "system",
          content:
            inputMode === "photo"
              ? "You extract structured retail shopping intent from a clothing image and optional customer context. Infer only visible garment types, colours and style attributes. Never infer an event from appearance alone. When context does not specify occasion, use 'style inspiration'; when it does not specify size, use 'Any'; when it does not specify budget, use null; when it does not specify urgency, use 'not specified'. Do not invent inventory, price, floor, aisle, bay, or stock facts."
              : "You extract structured retail shopping intent. Do not invent inventory, price, floor, aisle, bay, or stock facts.",
        },
        {
          role: "user",
          content:
            inputMode === "photo" && imageDataUrl
              ? [
                  {
                    type: "text",
                    text: `${schemaInstruction}\nCustomer context: ${
                      query || "No additional context. Describe the visible clothing as style inspiration only."
                    }`,
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: imageDataUrl,
                    },
                  },
                ]
              : `${schemaInstruction}\nCustomer request: ${query}`,
        },
      ],
    }),
  );

  const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}") as Partial<InputIntent>;
  const fallback = analyzeInputDemo({ query, inputMode });

  return {
    items: Array.isArray(parsed.items) ? parsed.items.map(String) : fallback.items,
    category: parsed.category || fallback.category,
    gender: normalizeGender(parsed.gender || fallback.gender),
    occasion: parsed.occasion || fallback.occasion,
    size: parsed.size || fallback.size,
    budget:
      typeof parsed.budget === "number" || parsed.budget === null
        ? parsed.budget
        : fallback.budget,
    colours: Array.isArray(parsed.colours) ? parsed.colours.map(String) : fallback.colours,
    styleConstraints: Array.isArray(parsed.styleConstraints)
      ? parsed.styleConstraints.map(String)
      : fallback.styleConstraints,
    store: parsed.store || fallback.store,
    urgency: parsed.urgency || fallback.urgency,
  };
}
