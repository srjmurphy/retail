import type { CatalogCard } from "@/types/demo";

export type CookbookRow = {
  id: string;
  gender: string;
  masterCategory: string;
  subCategory: string;
  articleType: string;
  baseColour: string;
  season: string;
  year: string;
  usage: string;
  productDisplayName: string;
};

export type CatalogItem = CatalogCard & {
  searchText: string;
};
