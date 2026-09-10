import * as cheerio from "cheerio";
import { DIRECTORY_SOURCES, IGNORE_DOMAINS } from "./config";
import { fetchText } from "./http";
import { classifyPage } from "./classifier";

function ignored(url: string) {
  const low = url.toLowerCase();
  return IGNORE_DOMAINS.some(d => low.includes(d));
}

function externalLinks(sourceUrl: string, html: string) {
  const $ = cheerio.load(html);
  const sourceDomain = new URL(sourceUrl).hostname;
  const links = new Set<string>();

  $("a[href]").each((_, el) => {
    try {
      const href = new URL($(el).attr("href") || "", sourceUrl);
      if (!["http:", "https:"].includes(href.protocol)) return;
      if (href.hostname === sourceDomain || ignored(href.href)) return;
      links.add(href.origin);
    } catch {}
  });

  return [...links];
}

export async function discoverCandidates(
  directories = DIRECTORY_SOURCES,
  maxPerDirectory = 100
) {
  const candidates = new Set<string>();

  for (const directory of directories) {
    const result = await fetchText(directory);
    if (!result) continue;

    for (const url of externalLinks(directory, result.text).slice(0, maxPerDirectory)) {
      candidates.add(url);
    }
  }

  return [...candidates];
}

export async function verifySource(url: string) {
  const result = await fetchText(url);
  if (!result) return null;

  const classified = classifyPage(url, result.text);

  // Keep source only when there is actual learning-content evidence.
  if (!classified.contentTypes.length) return null;

  return classified;
}
