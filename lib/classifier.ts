import * as cheerio from "cheerio";
import {
  COURSE_KEYWORDS, SCORM_KEYWORDS, SCO_KEYWORDS, H5P_KEYWORDS,
  INTERACTIVE_KEYWORDS, LICENSE_KEYWORDS, DOWNLOAD_KEYWORDS, FILE_EXTENSIONS,
} from "./config";
import { SourceResult } from "./types";

const hit = (text: string, keywords: string[]) =>
  keywords.filter(k => text.includes(k));

export function classifyPage(url: string, html: string): SourceResult {
  const $ = cheerio.load(html);
  const text = $("body").text().replace(/\s+/g, " ").toLowerCase();
  const allText = `${$("html").html() || ""} ${text}`.toLowerCase();

  const courseHits = hit(text, COURSE_KEYWORDS);
  const scormHits = hit(allText, SCORM_KEYWORDS);
  const scoHits = hit(text, SCO_KEYWORDS);
  const h5pHits = hit(allText, H5P_KEYWORDS);
  const interactiveHits = hit(text, INTERACTIVE_KEYWORDS);
  const licenseHits = hit(allText, LICENSE_KEYWORDS);
  const downloadHits = hit(allText, DOWNLOAD_KEYWORDS);

  const relevantLinks: string[] = [];
  const downloadEvidence: string[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const absolute = new URL(href, url).href;
    const label = $(el).text().trim().toLowerCase();
    const combined = `${absolute} ${label}`.toLowerCase();

    if (FILE_EXTENSIONS.some(ext => absolute.toLowerCase().split("?")[0].endsWith(ext))) {
      downloadEvidence.push(`file link: ${absolute}`);
    }
    if (
      /course|scorm|sco|h5p|interactive|learning|oer/.test(combined)
    ) {
      relevantLinks.push(absolute);
    }
  });

  const contentTypes = [
    courseHits.length ? "COURSE" : null,
    scormHits.length ? "SCORM" : null,
    scoHits.length ? "SCO" : null,
    h5pHits.length ? "H5P" : null,
    interactiveHits.length ? "INTERACTIVE" : null,
  ].filter(Boolean) as SourceResult["contentTypes"];

  // This is source discovery, not legal determination.
  // A score indicates evidence strength only.
  let score = 0;
  score += Math.min(courseHits.length * 8, 24);
  score += Math.min(scormHits.length * 15, 45);
  score += Math.min(scoHits.length * 12, 24);
  score += Math.min(h5pHits.length * 12, 24);
  score += Math.min(interactiveHits.length * 10, 20);
  score += Math.min(licenseHits.length * 5, 15);
  score += Math.min(downloadHits.length * 5, 15);
  score += Math.min(downloadEvidence.length * 8, 16);

  const title = $("title").first().text().trim();

  return {
    url,
    domain: new URL(url).hostname,
    title,
    contentTypes: [...new Set(contentTypes)],
    score: Math.min(score, 100),
    evidence: [
      ...courseHits.map(x => `course keyword: ${x}`),
      ...scormHits.map(x => `SCORM keyword: ${x}`),
      ...scoHits.map(x => `SCO keyword: ${x}`),
      ...h5pHits.map(x => `H5P keyword: ${x}`),
      ...interactiveHits.map(x => `interactive keyword: ${x}`),
    ],
    licenseEvidence: licenseHits.map(x => `license keyword: ${x}`),
    downloadEvidence: [
      ...downloadHits.map(x => `download keyword: ${x}`),
      ...downloadEvidence,
    ],
    relevantLinks: [...new Set(relevantLinks)].slice(0, 50),
  };
}
