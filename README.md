# RetailNext AI Retail Intelligence Demo

## What this is

A Next.js App Router demo for an OpenAI Solutions Engineering onsite story:

**Recommend → Locate → Optimise**

The cookbook recommends outfits. RetailNext needs more than recommendations. This demo extends the cookbook into retail execution intelligence: recommend the right item, locate it in-store, and convert every hit or miss into merchandising action.

## How it extends the OpenAI cookbook

Original cookbook:
https://developers.openai.com/cookbook/examples/how_to_combine_gpt4o_with_rag_outfit_assistant

Sample data:
https://github.com/openai/openai-cookbook/tree/main/examples/data/sample_clothes

Sample images:
https://github.com/openai/openai-cookbook/tree/main/examples/data/sample_clothes/sample_images

The app preserves the cookbook pattern:

- GPT-4o analyzes text or image intent in Live AI mode.
- Product text is loaded from the static cookbook clothing CSV.
- Product rows are enriched into `searchText`.
- Retrieval uses embeddings/cosine similarity over product records.
- A GPT-4o-style guardrail confirms or drops matches.

RetailNext then adds execution intelligence:

- deterministic inventory and store location tools
- in-store route cards
- business-aware ranking after quality and availability
- demand-signal logging
- Trend-to-Rack Copilot merchandising actions

## Use of cookbook sample_images

`sample_images` provides local product imagery.

Image filenames are numeric product IDs. Product cards use `/sample_clothes/sample_images/{id}.jpg` when available. Photo mode can use bundled sample images to mirror the cookbook’s image-analysis input. Placeholders are only fallback when no matching image exists.

This repo downloads the official cookbook `sample_images` into:

`public/sample_clothes/sample_images/*.jpg`

## How sample_styles.csv is used

The app loads:

`data/sample_clothes/sample_styles.csv`

Rows are normalized into catalog items while preserving cookbook fields such as `id`, `productDisplayName`, `articleType`, `gender`, `masterCategory`, `subCategory`, `baseColour`, `usage`, and `season`.

RetailNext fields such as `occasionTags`, `styleTags`, `price`, `available_sizes`, `inventory_health_score`, and `commercial_priority_score` are added in code. The derived `searchText` field makes event-led queries work without hardcoding final recommendations.

## How embeddings/RAG work

Demo mode uses deterministic token embeddings and cosine similarity over enriched `searchText`.

Live AI mode uses `text-embedding-3-large` for the query and compares against the cookbook embedding data when `sample_styles_with_embeddings.csv` is present. Results then pass through inventory/location filtering, guardrails, and business-aware ranking.

## Demo mode vs Live AI mode

Demo mode is default. It needs no API key, no network, and is deterministic.

Live AI mode runs server-side OpenAI calls through Next.js route handlers only:

- `/api/recommend`
- `/api/trend-to-rack`

If the key is missing, a call fails, a timeout occurs, or a response is invalid, the app returns the Demo mode result and shows:

`Live AI unavailable — showing simulated result.`

## How to run

```bash
npm install
npm run dev
```

Open:

`http://localhost:3000`

To refresh cookbook assets:

```bash
npm run fetch:cookbook-assets
```

## How to set OPENAI_API_KEY

Create `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_VISION_MODEL=gpt-4o
OPENAI_TEXT_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
```

The defaults are centralized in:

`src/lib/openai/models.ts`

## Security note

The API key is server-side only. The app reads `OPENAI_API_KEY` in route handlers and never uses `NEXT_PUBLIC_OPENAI_API_KEY`.

## 60-second demo script

1. Open app in Demo mode.
2. Recommend tab.
3. Run success query:
   I need a navy outfit for an outdoor wedding next weekend, men's, size 42, under $400.
4. Show dimmed lazy-loader pipeline.
5. Show product results with real sample images.
6. Open presenter annotation briefly.
7. Click Locate in store.
8. Show step-by-step in-store route:
   Entrance → Floor → Department → Aisle → Bay → Fitting Room.
9. Return to Recommend.
10. Run miss query:
    I need plus-size formalwear for a winter wedding this weekend, under $250.
11. Show lazy-loader pipeline and no adequate in-stock result.
12. Confirm unmet demand logged.
13. Open Optimise / Trend-to-Rack Copilot.
14. Run:
    What demand are we missing before this weekend, and what should RetailNext move, promote, or brief?
15. Show dimmed tool-call lazy-loader.
16. Show Recommended Buy Signals, threshold slider, expandable tool-call trace, and action brief.
17. Jump back to Recommend and verify previous results remain visible.
18. Jump back to Optimise and verify demand signals persist.

## Anti-happy-path explanation

The app is not wired to one canned query. Demo mode still runs:

intent extraction → embedding/RAG retrieval → inventory/location filtering → guardrail validation → business-aware ranking

The internal coverage route runs the required queries and returns extracted intent, top retrieved `productDisplayName` values, image availability, inventory status, route availability, and hit/partial/miss status:

`GET /api/retrieval-coverage`

The deliberate miss query is:

`I need plus-size formalwear for a winter wedding this weekend, under $250.`

## State persistence across tabs

State is shared in-memory at the top-level React app state layer.

Switching tabs does not reset Recommend results, Locate selection, generated route, Optimise demand signals, mode selection, or the threshold. No `localStorage` or `sessionStorage` is used. Reset only happens through the explicit `Reset demo` action.
