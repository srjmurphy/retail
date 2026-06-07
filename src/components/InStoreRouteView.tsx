"use client";

import { ArrowLeft, Bell, CheckCircle2, MapPin, Send } from "lucide-react";
import type { AppTab, RecommendationCard } from "@/types/demo";
import { inventoryStatusLabel } from "@/lib/inventory/labels";

function ProductImage({ selected }: { selected: RecommendationCard }) {
  if (selected.product.imagePath) {
    return (
      <img
        src={selected.product.imagePath}
        alt={selected.product.productDisplayName}
        className="h-44 w-full rounded-md bg-neutral-100 object-contain"
      />
    );
  }

  return <div className="h-44 rounded-md bg-neutral-100" />;
}

export function InStoreRouteView({
  selected,
  setActiveTab,
}: {
  selected: RecommendationCard | null;
  setActiveTab: (tab: AppTab) => void;
}) {
  if (!selected) {
    return (
      <section className="rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Fulfil</p>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-950">Maven Navigator</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
          Choose a product from Style to turn live inventory into an associate-ready store route.
        </p>
        <button
          type="button"
          onClick={() => setActiveTab("recommend")}
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Style
        </button>
      </section>
    );
  }

  if (!selected.location || !selected.inventory) {
    return (
      <section className="rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Fulfil</p>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-950">{selected.product.productDisplayName}</h1>
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          {inventoryStatusLabel(selected.inventoryStatus)}
        </p>
        <button
          type="button"
          onClick={() => setActiveTab("recommend")}
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Style
        </button>
      </section>
    );
  }

  const route = selected.location;
  const storeName = selected.inventory.storeName;
  const fittingRoom = route.routeSteps[5]?.match(/Fitting Room \d+/)?.[0] ?? "Fitting Room";
  const routeCards = [
    {
      label: "Entrance",
      value: "Main doors",
      colour: "bg-neutral-100 text-neutral-800",
      instruction: route.routeSteps[0],
    },
    {
      label: "Floor",
      value: route.floor,
      colour: "bg-blue-50 text-blue-700",
      instruction: route.routeSteps[1],
    },
    {
      label: "Department",
      value: route.department,
      colour: "bg-purple-50 text-purple-700",
      instruction: route.routeSteps[2],
    },
    {
      label: "Aisle",
      value: route.aisle,
      colour: "bg-amber-50 text-amber-800",
      instruction: route.routeSteps[3],
    },
    {
      label: "Bay",
      value: route.bay,
      colour: "bg-amber-50 text-amber-800",
      instruction: route.routeSteps[4],
    },
    {
      label: "Fitting Room",
      value: fittingRoom,
      colour: "bg-emerald-50 text-emerald-700",
      instruction: route.routeSteps[5],
    },
  ];

  return (
    <section className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
      <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Fulfil</p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-950">Maven Navigator</h1>
        <div className="mt-5">
          <ProductImage selected={selected} />
        </div>
        <h2 className="mt-4 text-lg font-semibold leading-snug text-neutral-950">{selected.product.productDisplayName}</h2>
        <p className="mt-2 text-sm text-neutral-600">{selected.product.articleType}</p>

        <div className="mt-5 grid gap-3 text-sm">
          <div className="rounded-md bg-emerald-50 px-3 py-2 font-medium text-emerald-700">
            {selected.inventory.stockCount} in stock, size {selected.inventory.size} at {storeName}
          </div>
          <div className="rounded-md bg-blue-50 px-3 py-2 font-medium text-blue-700">
            {selected.inventory.pickupAvailability}
          </div>
          <div className="rounded-md bg-blue-50 px-3 py-2 font-medium text-blue-700">{route.floor}</div>
          <div className="rounded-md bg-purple-50 px-3 py-2 font-medium text-purple-700">
            {route.department} / {route.zone}
          </div>
          <div className="rounded-md bg-amber-50 px-3 py-2 font-medium text-amber-800">
            {route.aisle}, {route.bay}
          </div>
          <div className="rounded-md bg-neutral-100 px-3 py-2 font-medium text-neutral-800">{route.associateNote}</div>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">{storeName}</p>
            <h2 className="mt-1 text-xl font-semibold text-neutral-950">Entrance → Floor → Department → Aisle → Bay → Fitting Room</h2>
          </div>
          <MapPin className="h-6 w-6 text-neutral-500" aria-hidden="true" />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {routeCards.map((card) => (
            <div key={card.label} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${card.colour}`}>{card.label}</span>
              <p className="mt-3 text-lg font-semibold text-neutral-950">{card.value}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{card.instruction}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-neutral-200 bg-[#fbfaf7] p-4">
          <p className="text-sm font-semibold text-neutral-950">Route summary</p>
          <p className="mt-2 text-sm leading-6 text-neutral-700">
            Follow the route to {route.floor}, continue into {route.department}, then go to {route.aisle}, {route.bay}.
            The item is on the {route.landmark}.
          </p>
          <p className="mt-3 text-sm font-medium text-neutral-950">
            Available is not enough — the customer or associate still needs to find it in-store.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Prepare fitting room
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Send to associate
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            Flag route issue
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("recommend")}
            className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Style
          </button>
        </div>
      </div>
    </section>
  );
}
