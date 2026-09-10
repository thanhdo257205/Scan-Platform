import { NextResponse } from "next/server";
import { getSitemapUrls } from "@/lib/sitemap";
import { classifyPage } from "@/lib/classifier";
import { fetchText } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const { url, maxPages = 50 } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const sitemapUrls = await getSitemapUrls(url, Number(maxPages));
    const urls = sitemapUrls.length ? sitemapUrls : [url];

    const results = [];
    for (const pageUrl of urls.slice(0, Number(maxPages))) {
      const result = await fetchText(pageUrl);
      if (!result || !result.contentType.includes("text/html")) continue;

      const classified = classifyPage(pageUrl, result.text);
      if (classified.contentTypes.length) results.push(classified);
    }

    results.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      source: url,
      scanned: urls.length,
      matches: results.length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
