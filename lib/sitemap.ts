import { fetchText } from "./http";

function extractLocs(xml: string) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
    .map(m => m[1].trim());
}

export async function getSitemapUrls(baseUrl: string, limit = 500) {
  const origin = new URL(baseUrl).origin;
  const candidates = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
  ];

  for (const sitemapUrl of candidates) {
    const result = await fetchText(sitemapUrl);
    if (!result) continue;

    const locs = extractLocs(result.text);
    if (!locs.length) continue;

    // sitemapindex: recursively inspect child sitemaps
    if (/<sitemapindex/i.test(result.text)) {
      const urls: string[] = [];
      for (const child of locs.slice(0, 20)) {
        const childResult = await fetchText(child);
        if (!childResult) continue;
        urls.push(...extractLocs(childResult.text));
        if (urls.length >= limit) break;
      }
      return [...new Set(urls)].slice(0, limit);
    }

    return [...new Set(locs)].slice(0, limit);
  }

  return [];
}
