import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CookbookRow } from "./types";

const csvPath = path.join(process.cwd(), "data", "sample_clothes", "sample_styles.csv");

function parseCsvLine(line: string) {
  const fields: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];

    if (character === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      quoted = !quoted;
      continue;
    }

    if (character === "," && !quoted) {
      fields.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  fields.push(current);
  return fields;
}

export function loadCookbookRows(): CookbookRow[] {
  if (!existsSync(csvPath)) {
    throw new Error(
      "Missing data/sample_clothes/sample_styles.csv. Run npm run fetch:cookbook-assets or scripts/fetch-cookbook-assets.mjs.",
    );
  }

  const csv = readFileSync(csvPath, "utf8").trim();
  const [headerLine, ...lines] = csv.split(/\r?\n/);
  const headers = parseCsvLine(headerLine);

  return lines
    .filter(Boolean)
    .map((line) => {
      const values = parseCsvLine(line);
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));

      return {
        id: row.id,
        gender: row.gender,
        masterCategory: row.masterCategory,
        subCategory: row.subCategory,
        articleType: row.articleType,
        baseColour: row.baseColour,
        season: row.season,
        year: row.year,
        usage: row.usage,
        productDisplayName: row.productDisplayName,
      };
    });
}
