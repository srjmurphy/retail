"use client";

import { ChevronDown, MapPin, PackageCheck } from "lucide-react";
import type { RecommendationCard } from "@/types/demo";
import { inventoryStatusLabel } from "@/lib/inventory/labels";

function ProductImage({ recommendation }: { recommendation: RecommendationCard }) {
  if (recommendation.product.imagePath) {
    return (
      <img
        src={recommendation.product.imagePath}
        alt={recommendation.product.productDisplayName}
        className="h-52 w-full rounded-md bg-neutral-100 object-contain"
      />
    );
  }

  return (
    <div className="flex h-52 w-full items-center justify-center rounded-md bg-[linear-gradient(135deg,#ece7dc,#f8f6ef)] text-sm font-medium text-neutral-500">
      Product image
    </div>
  );
}

export function ProductCard({
  recommendation,
  onLocate,
}: {
  recommendation: RecommendationCard;
  onLocate: (recommendation: RecommendationCard) => void;
}) {
  const locatable =
    (recommendation.inventoryStatus === "in_stock" || recommendation.inventoryStatus === "nearby_store") &&
    recommendation.location;
  const stockTone =
    recommendation.inventoryStatus === "in_stock"
      ? "bg-emerald-50 text-emerald-700"
      : recommendation.inventoryStatus === "nearby_store"
        ? "bg-blue-50 text-blue-700"
        : "bg-amber-50 text-amber-800";
  const cardTone =
    recommendation.inventoryStatus === "in_stock"
      ? "border-t-emerald-500"
      : recommendation.inventoryStatus === "nearby_store"
        ? "border-t-blue-500"
        : "border-t-amber-500";

  return (
    <article className={`rounded-lg border border-t-4 border-neutral-200 bg-white p-4 shadow-sm ${cardTone}`}>
      <ProductImage recommendation={recommendation} />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
            {recommendation.product.articleType}
          </p>
          <h3 className="mt-1 text-base font-semibold leading-snug text-neutral-950">
            {recommendation.product.productDisplayName}
          </h3>
        </div>
        <p className="rounded bg-neutral-950 px-2.5 py-1 text-sm font-semibold text-white">
          ${recommendation.product.price}
        </p>
      </div>

      <p className="mt-3 text-sm leading-6 text-neutral-600">{recommendation.whyThisMatches}</p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
        <span className={`inline-flex items-center gap-1 rounded px-2.5 py-1 ${stockTone}`}>
          <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {inventoryStatusLabel(recommendation.inventoryStatus)}
        </span>
        {recommendation.inventory ? (
          <span className="rounded bg-neutral-100 px-2.5 py-1 text-neutral-700">
            {recommendation.inventory.storeName}
          </span>
        ) : null}
        <span className="rounded bg-blue-50 px-2.5 py-1 text-blue-700">
          Sizes {recommendation.product.available_sizes.slice(0, 5).join(", ")}
        </span>
        {recommendation.location ? (
          <span className="rounded bg-amber-50 px-2.5 py-1 text-amber-800">
            {recommendation.location.floor}, {recommendation.location.aisle}, {recommendation.location.bay}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {locatable ? (
          <button
            type="button"
            onClick={() => onLocate(recommendation)}
            className="inline-flex items-center gap-2 rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {recommendation.inventoryStatus === "nearby_store" ? "Locate nearby store" : "Locate in store"}
          </button>
        ) : (
          <span className="rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600">
            {inventoryStatusLabel(recommendation.inventoryStatus)}
          </span>
        )}
      </div>

      <details className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
        <summary className="flex items-center justify-between gap-3 text-sm font-medium text-neutral-800">
          Presenter annotation
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </summary>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-neutral-600">
          <div>
            <dt className="font-semibold text-neutral-900">Similarity score</dt>
            <dd>{recommendation.similarityScore}</dd>
          </div>
          <div>
            <dt className="font-semibold text-neutral-900">Guardrail</dt>
            <dd>{recommendation.guardrail.accepted ? "Accepted" : "Dropped"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-neutral-900">Inventory status</dt>
            <dd>{inventoryStatusLabel(recommendation.inventoryStatus)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-neutral-900">Inventory health</dt>
            <dd>{recommendation.product.inventory_health_score}</dd>
          </div>
          <div>
            <dt className="font-semibold text-neutral-900">Commercial priority</dt>
            <dd>{recommendation.product.commercial_priority_score}</dd>
          </div>
          <div>
            <dt className="font-semibold text-neutral-900">Image source</dt>
            <dd>{recommendation.product.imageSource}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs leading-5 text-neutral-600">{recommendation.rankingReason}</p>
        <p className="mt-2 text-xs leading-5 text-neutral-600">{recommendation.guardrail.reason}</p>
      </details>
    </article>
  );
}
