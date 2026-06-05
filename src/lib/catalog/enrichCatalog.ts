import { existsSync } from "node:fs";
import path from "node:path";
import type { ImageSource } from "@/types/demo";
import { loadCookbookRows } from "./loadCookbookData";
import type { CatalogItem, CookbookRow } from "./types";

type Enrichment = {
  occasionTags?: string[];
  styleTags?: string[];
  price?: number;
  priceBand?: string;
  available_sizes?: string[];
  inventory_health_score?: number;
  commercial_priority_score?: number;
  storeAvailability?: string;
};

const specificEnrichment: Record<string, Enrichment> = {
  "27152": {
    occasionTags: ["outdoor wedding", "interview", "work event"],
    styleTags: ["blue", "navy palette", "formal shirt", "tailored base", "mens occasionwear"],
    price: 89,
    available_sizes: ["38", "40", "42", "M", "L"],
    inventory_health_score: 88,
    commercial_priority_score: 82,
    storeAvailability: "Oak Street flagship",
  },
  "18197": {
    occasionTags: ["outdoor wedding", "interview", "smart casual"],
    styleTags: ["navy", "tailored trouser", "menswear", "formal separates"],
    price: 118,
    available_sizes: ["32", "34", "36", "42", "M"],
    inventory_health_score: 84,
    commercial_priority_score: 78,
    storeAvailability: "Oak Street flagship",
  },
  "14713": {
    occasionTags: ["outdoor wedding", "interview", "formal event"],
    styleTags: ["brown", "tailored trouser", "neutral", "mens occasionwear"],
    price: 112,
    available_sizes: ["32", "34", "36", "42"],
    inventory_health_score: 73,
    commercial_priority_score: 70,
    storeAvailability: "Oak Street flagship",
  },
  "45595": {
    occasionTags: ["outdoor wedding", "interview", "graduation"],
    styleTags: ["brown leather", "formal shoes", "comfortable", "menswear"],
    price: 126,
    available_sizes: ["8", "9", "10", "11", "42"],
    inventory_health_score: 91,
    commercial_priority_score: 80,
    storeAvailability: "Oak Street flagship",
  },
  "49696": {
    occasionTags: ["outdoor wedding", "interview", "graduation"],
    styleTags: ["blue tie", "accessory", "formal accent", "navy palette"],
    price: 42,
    available_sizes: ["One Size"],
    inventory_health_score: 86,
    commercial_priority_score: 74,
    storeAvailability: "Oak Street flagship",
  },
  "16035": {
    occasionTags: ["interview", "work event", "smart casual"],
    styleTags: ["white shirt", "checked shirt", "clean foundation", "menswear"],
    price: 72,
    available_sizes: ["S", "M", "L", "42"],
    inventory_health_score: 77,
    commercial_priority_score: 68,
    storeAvailability: "Oak Street flagship",
  },
  "38974": {
    occasionTags: ["interview", "work gala", "holiday party"],
    styleTags: ["black shirt", "formal", "smart casual", "evening"],
    price: 94,
    available_sizes: ["M", "L", "42"],
    inventory_health_score: 66,
    commercial_priority_score: 75,
    storeAvailability: "Oak Street flagship",
  },
  "48481": {
    occasionTags: ["work gala", "holiday party", "winter wedding"],
    styleTags: ["black dress", "cocktail", "formal", "evening"],
    price: 229,
    available_sizes: ["8", "10", "12"],
    inventory_health_score: 79,
    commercial_priority_score: 89,
    storeAvailability: "Oak Street flagship",
  },
  "59982": {
    occasionTags: ["work gala", "holiday party"],
    styleTags: ["black dress", "cream detail", "evening", "occasion dress"],
    price: 218,
    available_sizes: ["8", "10", "12"],
    inventory_health_score: 71,
    commercial_priority_score: 86,
    storeAvailability: "Oak Street flagship",
  },
  "57993": {
    occasionTags: ["outdoor wedding", "work gala", "graduation"],
    styleTags: ["beige dress", "soft neutral", "occasion dress", "summer event"],
    price: 188,
    available_sizes: ["8", "10", "12"],
    inventory_health_score: 83,
    commercial_priority_score: 77,
    storeAvailability: "Oak Street flagship",
  },
  "59973": {
    occasionTags: ["work gala", "holiday party", "outdoor wedding"],
    styleTags: ["navy dress", "formal", "evening", "women occasionwear"],
    price: 238,
    available_sizes: ["8", "10", "12"],
    inventory_health_score: 76,
    commercial_priority_score: 88,
    storeAvailability: "Oak Street flagship",
  },
  "34586": {
    occasionTags: ["holiday party", "work gala"],
    styleTags: ["black dress", "printed", "party", "evening"],
    price: 206,
    available_sizes: ["8", "10", "12"],
    inventory_health_score: 69,
    commercial_priority_score: 84,
    storeAvailability: "Oak Street flagship",
  },
  "47548": {
    occasionTags: ["holiday party", "work gala", "winter wedding", "graduation"],
    styleTags: ["red heels", "statement shoe", "occasion footwear"],
    price: 96,
    available_sizes: ["6", "7", "8", "10", "12"],
    inventory_health_score: 81,
    commercial_priority_score: 79,
    storeAvailability: "Oak Street flagship",
  },
  "10616": {
    occasionTags: ["graduation", "holiday party", "work gala"],
    styleTags: ["gold shoes", "comfortable", "occasion footwear", "sparkle"],
    price: 74,
    available_sizes: ["6", "7", "8", "10", "12"],
    inventory_health_score: 82,
    commercial_priority_score: 72,
    storeAvailability: "Oak Street flagship",
  },
  "32379": {
    occasionTags: ["graduation", "outdoor wedding", "summer event"],
    styleTags: ["off white dress", "light dress", "ceremony", "occasion dress"],
    price: 174,
    available_sizes: ["8", "10", "12"],
    inventory_health_score: 74,
    commercial_priority_score: 71,
    storeAvailability: "Oak Street flagship",
  },
  "23051": {
    occasionTags: ["holiday party", "work gala"],
    styleTags: ["navy dress", "printed dress", "evening"],
    price: 196,
    available_sizes: ["8", "10", "12"],
    inventory_health_score: 63,
    commercial_priority_score: 82,
    storeAvailability: "Online only",
  },
  "57139": {
    occasionTags: ["interview", "work event"],
    styleTags: ["black trouser", "women workwear", "tailored"],
    price: 118,
    available_sizes: ["8", "10", "12"],
    inventory_health_score: 70,
    commercial_priority_score: 76,
    storeAvailability: "Oak Street flagship",
  },
  "27917": {
    occasionTags: ["work event", "interview"],
    styleTags: ["brown trouser", "women workwear", "tailored"],
    price: 124,
    available_sizes: ["8", "10", "12"],
    inventory_health_score: 67,
    commercial_priority_score: 70,
    storeAvailability: "Oak Street flagship",
  },
};

let cachedCatalog: CatalogItem[] | null = null;

function titleTokens(row: CookbookRow) {
  return [
    row.productDisplayName,
    row.articleType,
    row.gender,
    row.masterCategory,
    row.subCategory,
    row.baseColour,
    row.usage,
    row.season,
  ].join(" ");
}

function defaultPrice(row: CookbookRow) {
  const text = titleTokens(row).toLowerCase();

  if (text.includes("formal shoes")) return 132;
  if (text.includes("shoes")) return 98;
  if (text.includes("heels")) return 86;
  if (text.includes("dress")) return 184;
  if (text.includes("saree")) return 228;
  if (text.includes("trousers")) return 118;
  if (text.includes("shirt")) return 74;
  if (text.includes("tie")) return 42;
  if (text.includes("kurta")) return 92;
  return 58;
}

function defaultSizes(row: CookbookRow) {
  const text = titleTokens(row).toLowerCase();

  if (row.articleType.toLowerCase().includes("shoes") || text.includes("heels") || text.includes("flip flops")) {
    return row.gender === "Men" ? ["8", "9", "10", "11"] : ["6", "7", "8"];
  }

  if (row.gender === "Men") return ["S", "M", "L", "40", "42"];
  if (row.gender === "Women") return ["8", "10", "12"];
  return ["One Size"];
}

function defaultOccasionTags(row: CookbookRow) {
  const text = titleTokens(row).toLowerCase();
  const tags = new Set<string>();

  if (text.includes("formal")) {
    tags.add("interview");
    tags.add("work event");
  }

  if (text.includes("dress") || text.includes("heels") || text.includes("saree")) {
    tags.add("work gala");
    tags.add("holiday party");
    tags.add("graduation");
  }

  if (text.includes("blue") || text.includes("brown") || text.includes("shirt") || text.includes("formal shoes")) {
    tags.add("outdoor wedding");
  }

  if (row.usage.toLowerCase() === "casual") {
    tags.add("vacation");
    tags.add("smart casual");
  }

  return Array.from(tags);
}

function defaultStyleTags(row: CookbookRow) {
  const tags = new Set<string>([
    row.baseColour.toLowerCase(),
    row.articleType.toLowerCase(),
    row.subCategory.toLowerCase(),
    row.usage.toLowerCase(),
  ]);

  if (row.baseColour.toLowerCase().includes("blue")) tags.add("navy palette");
  if (row.usage.toLowerCase() === "formal") tags.add("occasionwear");
  if (row.articleType.toLowerCase().includes("shoes")) tags.add("footwear");
  if (row.articleType.toLowerCase().includes("dress")) tags.add("dress");
  if (row.articleType.toLowerCase().includes("shirt")) tags.add("shirt");

  return Array.from(tags).filter(Boolean);
}

function priceBand(price: number) {
  if (price < 100) return "under $100";
  if (price < 250) return "under $250";
  if (price < 400) return "under $400";
  return "$400+";
}

function imageInfo(id: string): { imagePath: string; imageSource: ImageSource } {
  const relativePath = `/sample_clothes/sample_images/${id}.jpg`;
  const absolutePath = path.join(process.cwd(), "public", "sample_clothes", "sample_images", `${id}.jpg`);

  if (existsSync(absolutePath)) {
    return {
      imagePath: relativePath,
      imageSource: "cookbook_sample",
    };
  }

  return {
    imagePath: "",
    imageSource: "placeholder",
  };
}

function enrichRow(row: CookbookRow): CatalogItem {
  const enrichment = specificEnrichment[row.id] ?? {};
  const price = enrichment.price ?? defaultPrice(row);
  const occasionTags = enrichment.occasionTags ?? defaultOccasionTags(row);
  const styleTags = enrichment.styleTags ?? defaultStyleTags(row);
  const { imagePath, imageSource } = imageInfo(row.id);
  const searchText = [
    row.productDisplayName,
    row.articleType,
    row.gender,
    row.masterCategory,
    row.subCategory,
    row.baseColour,
    row.usage,
    row.season,
    occasionTags.join(" "),
    styleTags.join(" "),
    enrichment.priceBand ?? priceBand(price),
  ].join(" ");

  return {
    id: row.id,
    productDisplayName: row.productDisplayName,
    articleType: row.articleType,
    gender: row.gender,
    masterCategory: row.masterCategory,
    subCategory: row.subCategory,
    baseColour: row.baseColour,
    usage: row.usage,
    season: row.season,
    occasionTags,
    styleTags,
    price,
    priceBand: enrichment.priceBand ?? priceBand(price),
    available_sizes: enrichment.available_sizes ?? defaultSizes(row),
    inventory_health_score: enrichment.inventory_health_score ?? 50 + (Number(row.id) % 37),
    commercial_priority_score: enrichment.commercial_priority_score ?? 42 + (Number(row.id) % 43),
    storeAvailability: enrichment.storeAvailability ?? "Cookbook catalog",
    imagePath,
    imageSource,
    searchText,
  };
}

export function getCatalog() {
  if (!cachedCatalog) {
    cachedCatalog = loadCookbookRows().map(enrichRow);
  }

  return cachedCatalog;
}

export function getCatalogItem(productId: string) {
  return getCatalog().find((item) => item.id === productId) ?? null;
}
