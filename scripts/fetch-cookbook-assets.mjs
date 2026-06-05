import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data", "sample_clothes");
const imageDir = path.join(root, "public", "sample_clothes", "sample_images");
const rawBase =
  "https://raw.githubusercontent.com/openai/openai-cookbook/main/examples/data/sample_clothes";
const apiBase =
  "https://api.github.com/repos/openai/openai-cookbook/contents/examples/data/sample_clothes";

async function getBuffer(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "retailnext-ai-demo-asset-fetcher",
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} while fetching ${url}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "retailnext-ai-demo-asset-fetcher",
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} while fetching ${url}`);
  }

  return response.json();
}

async function downloadFile(url, destination) {
  const body = await getBuffer(url);
  await writeFile(destination, body);
  return body.length;
}

async function main() {
  await mkdir(dataDir, { recursive: true });
  await mkdir(imageDir, { recursive: true });

  const csvBytes = await downloadFile(
    `${rawBase}/sample_styles.csv`,
    path.join(dataDir, "sample_styles.csv"),
  );
  console.log(`Downloaded sample_styles.csv (${csvBytes} bytes)`);

  try {
    const embeddingBytes = await downloadFile(
      `${rawBase}/sample_styles_with_embeddings.csv`,
      path.join(dataDir, "sample_styles_with_embeddings.csv"),
    );
    console.log(`Downloaded sample_styles_with_embeddings.csv (${embeddingBytes} bytes)`);
  } catch (error) {
    console.log("sample_styles_with_embeddings.csv not available from cookbook; continuing.");
  }

  const imageEntries = await getJson(`${apiBase}/sample_images`);
  const jpgs = imageEntries
    .filter((entry) => entry.type === "file" && entry.name.toLowerCase().endsWith(".jpg"))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  let downloaded = 0;
  for (const entry of jpgs) {
    if (!entry.download_url) continue;
    const bytes = await downloadFile(entry.download_url, path.join(imageDir, entry.name));
    downloaded += 1;
    console.log(`Downloaded ${entry.name} (${bytes} bytes)`);
  }

  console.log(`Downloaded ${downloaded} cookbook sample images.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
