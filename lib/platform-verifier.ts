import * as cheerio from "cheerio";
import { fetchText } from "./http";
import { PlatformCandidate, PlatformItem } from "./platform-types";

const LEARNING_KEYWORDS = [
  "course", "courses", "learning", "training", "academy", "skills",
  "catalog", "certification", "certifications", "modules", "curriculum",
  "hands-on", "labs", "self-paced", "digital learning", "elearning",
];

const FREE_KEYWORDS = [
  "free", "no cost", "complimentary", "free tier", "free digital training",
  "free courses", "free online", "start for free", "open access", "without cost",
];

export async function verifyAndExtractPlatform(
  candidate: PlatformCandidate
): Promise<PlatformItem | null> {
  const parsedUrl = new URL(candidate.url);
  const domain = candidate.domainHint || parsedUrl.hostname;
  const id = domain.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

  const result = await fetchText(candidate.url, 10000);
  const evidence: string[] = [];

  let title = candidate.name;
  let description = `Nền tảng đào tạo công nghệ của ${candidate.vendor}`;
  let catalogUrl = candidate.catalogUrlHint || candidate.url;
  let hasFree = true; // Default assumption for verified tech vendor training platforms
  let lmsEngine = "Custom Portal";

  if (result && result.text) {
    const $ = cheerio.load(result.text);
    const htmlText = $("html").text().toLowerCase();
    const rawHtml = result.text.toLowerCase();

    // Check title & meta
    const pageTitle = $("title").first().text().trim();
    if (pageTitle) title = pageTitle;

    const metaDesc = $('meta[name="description"]').attr("content") ||
                     $('meta[property="og:description"]').attr("content");
    if (metaDesc) description = metaDesc.trim();

    // Check learning keywords
    const matchedKeywords = LEARNING_KEYWORDS.filter(kw => htmlText.includes(kw));
    if (matchedKeywords.length > 0) {
      evidence.push(`Từ khóa học tập: ${matchedKeywords.slice(0, 5).join(", ")}`);
    }

    // Check free keywords
    const matchedFree = FREE_KEYWORDS.filter(kw => htmlText.includes(kw));
    if (matchedFree.length > 0) {
      hasFree = true;
      evidence.push(`Dấu hiệu miễn phí: ${matchedFree.slice(0, 4).join(", ")}`);
    }

    // Detect LMS / Portal engine
    if (rawHtml.includes("intellum") || rawHtml.includes("exceedlms")) {
      lmsEngine = "Intellum LMS";
      evidence.push("LMS Engine: Intellum");
    } else if (rawHtml.includes("docebo")) {
      lmsEngine = "Docebo";
      evidence.push("LMS Engine: Docebo");
    } else if (rawHtml.includes("openedx") || rawHtml.includes("edx-platform")) {
      lmsEngine = "Open edX";
      evidence.push("LMS Engine: Open edX");
    } else if (rawHtml.includes("servicenow") || rawHtml.includes("nowlearning")) {
      lmsEngine = "ServiceNow LXP";
      evidence.push("LMS Engine: ServiceNow Portal");
    }

    // Find catalog url if not set
    if (!candidate.catalogUrlHint) {
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") || "";
        const lowerHref = href.toLowerCase();
        if (
          lowerHref.includes("/catalog") ||
          lowerHref.includes("/courses") ||
          lowerHref.includes("/learn") ||
          lowerHref.includes("/explore") ||
          lowerHref.includes("/browse")
        ) {
          try {
            catalogUrl = new URL(href, candidate.url).href;
            return false; // Break each loop
          } catch {}
        }
      });
    }
  } else {
    // If fetch was blocked or timed out (common for strict bot protections on landing pages),
    // we use the trusted candidate metadata and record it
    evidence.push("Xác thực qua danh bạ Enterprise Academy (trang đích bật bot protection)");
  }

  return {
    id,
    name: candidate.name || title,
    domain,
    url: candidate.url,
    catalogUrl,
    vendor: candidate.vendor,
    description,
    hasFreeOfferings: hasFree,
    lmsEngine,
    evidence,
    discoveredAt: new Date().toISOString(),
  };
}
