import * as cheerio from "cheerio";
import { PlatformCandidate, PlatformItem, DiscoverResult } from "./platform-types";
import { getExistingDomains, appendPlatforms } from "./platform-storage";
import { verifyAndExtractPlatform } from "./platform-verifier";
import { fetchText } from "./http";

/**
 * Danh sách domain hệ thống / rác cần bỏ qua khi cào tự động từ công cụ tìm kiếm
 */
const SYSTEM_IGNORE_DOMAINS = new Set([
  "google.com", "accounts.google.com", "mail.google.com", "maps.google.com",
  "facebook.com", "twitter.com", "x.com", "instagram.com", "youtube.com",
  "reddit.com", "linkedin.com", "wikipedia.org", "wikimedia.org", "duckduckgo.com",
  "bing.com", "yahoo.com", "pinterest.com", "apple.com", "microsoft.com/en-us/windows",
]);

/**
 * NGUỒN ĐỘNG 1: Cào trực tiếp danh bạ nền tảng MOOC & E-Learning toàn cầu từ Wikipedia API
 */
async function harvestFromWikipediaMooc(existingDomains: Set<string>): Promise<PlatformCandidate[]> {
  const candidates: PlatformCandidate[] = [];

  try {
    const res = await fetchText(
      "https://en.wikipedia.org/api/rest_v1/page/html/List_of_MOOC_providers",
      15000
    );
    if (!res || !res.text) return [];

    const $ = cheerio.load(res.text);

    $("table.wikitable tbody tr").each((_, row) => {
      const firstCell = $(row).find("td, th").first();
      const link = firstCell.find("a").first();
      const name = link.text().trim();

      // Tìm các link web ngoại bộ (external link) trong hàng đó
      let externalUrl = "";
      $(row).find("a.external, a[rel*='external']").each((_, ext) => {
        const href = $(ext).attr("href");
        if (href && href.startsWith("http") && !href.includes("wikipedia.org")) {
          externalUrl = href;
          return false; // Lấy link đầu tiên
        }
      });

      if (name && externalUrl) {
        try {
          const parsed = new URL(externalUrl);
          const domain = parsed.hostname.toLowerCase();

          if (!existingDomains.has(domain) && !SYSTEM_IGNORE_DOMAINS.has(domain)) {
            candidates.push({
              name,
              url: externalUrl,
              vendor: name,
              domainHint: domain,
              catalogUrlHint: externalUrl,
            });
          }
        } catch {}
      }
    });
  } catch (err) {
    console.error("Lỗi khi cào Wikipedia MOOC:", err);
  }

  return candidates;
}

/**
 * NGUỒN ĐỘNG 2: Gửi câu lệnh tìm kiếm Dork trực tiếp tới DuckDuckGo Live Search
 */
async function harvestFromSearchEngine(
  query: string,
  existingDomains: Set<string>
): Promise<PlatformCandidate[]> {
  const candidates: PlatformCandidate[] = [];

  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetchText(searchUrl, 15000);
    if (!res || !res.text) return [];

    const $ = cheerio.load(res.text);

    $(".result__body").each((_, el) => {
      const title = $(el).find(".result__title").text().trim();
      const rawUrl = $(el).find(".result__url").text().trim();

      if (rawUrl) {
        try {
          const cleanUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
          const parsed = new URL(cleanUrl);
          const domain = parsed.hostname.toLowerCase();

          // Lọc bỏ domain rác và domain đã lưu
          if (
            !existingDomains.has(domain) &&
            !SYSTEM_IGNORE_DOMAINS.has(domain) &&
            !candidates.some(c => c.domainHint === domain)
          ) {
            candidates.push({
              name: title || domain,
              url: `${parsed.protocol}//${domain}`,
              vendor: domain.split(".")[0].toUpperCase(),
              domainHint: domain,
              catalogUrlHint: cleanUrl,
            });
          }
        } catch {}
      }
    });
  } catch (err) {
    console.error("Lỗi khi cào DuckDuckGo Live Search:", err);
  }

  return candidates;
}

/**
 * NGUỒN ĐỘNG 3: Dò tìm subdomain đào tạo qua Nhật ký Chứng chỉ SSL toàn cầu (crt.sh)
 */
async function harvestFromCrtSh(
  pattern: string,
  existingDomains: Set<string>
): Promise<PlatformCandidate[]> {
  const candidates: PlatformCandidate[] = [];

  try {
    const res = await fetchText(`https://crt.sh/?q=${encodeURIComponent(pattern)}&output=json`, 15000);
    if (!res || !res.text) return [];

    const data = JSON.parse(res.text);
    if (!Array.isArray(data)) return [];

    for (const item of data) {
      if (candidates.length >= 25) break;

      const nameVal = item.common_name || item.name_value || "";
      const rawDomain = nameVal.split("\n")[0].trim().toLowerCase().replace(/^\*\./, "");

      if (
        rawDomain &&
        rawDomain.includes(".") &&
        !rawDomain.includes("*") &&
        !existingDomains.has(rawDomain) &&
        !SYSTEM_IGNORE_DOMAINS.has(rawDomain)
      ) {
        candidates.push({
          name: `Academy Portal (${rawDomain})`,
          url: `https://${rawDomain}`,
          vendor: rawDomain.split(".")[0].toUpperCase(),
          domainHint: rawDomain,
          catalogUrlHint: `https://${rawDomain}`,
        });
      }
    }
  } catch (err) {
    console.error("Lỗi khi truy vấn crt.sh:", err);
  }

  return candidates;
}

/**
 * HÀM ĐIỀU PHỐI CHÍNH: 100% DYNAMIC DISCOVERY
 * Không hề có bất kỳ danh sách nền tảng định nghĩa sẵn nào trong code.
 * Hệ thống tự động gửi request ra Internet, cào từ nhiều nguồn trực tiếp,
 * xác thực và lưu vào data/platforms.json.
 */
export async function discoverNewPlatforms(limit: number): Promise<DiscoverResult> {
  const existingDomains = getExistingDomains();
  const targetCount = Math.max(1, limit);
  const discovered: PlatformItem[] = [];

  console.log(`[Dynamic Discovery] Bắt đầu quét động từ Internet để tìm ${targetCount} nền tảng mới...`);

  // Tập hợp ứng viên thu thập được từ Internet trong phiên này
  const dynamicCandidatePool: PlatformCandidate[] = [];

  // Bộ câu truy vấn tìm kiếm chuyên sâu để săn các cổng đào tạo
  const SEARCH_QUERIES = [
    "free training academy course catalog online",
    "free digital training certification self-paced learning paths",
    "open courseware repository learning portal free",
    "enterprise learning academy skill builder catalog free",
    "free online courses credentials learning paths provider",
  ];

  // 1. Cào từ Wikipedia Live MOOC Directory
  const wikiCandidates = await harvestFromWikipediaMooc(existingDomains);
  dynamicCandidatePool.push(...wikiCandidates);

  // 2. Cào từ Search Engine Dorking (nếu cần thêm)
  let queryIndex = 0;
  while (dynamicCandidatePool.length < targetCount * 2 && queryIndex < SEARCH_QUERIES.length) {
    const query = SEARCH_QUERIES[queryIndex];
    const searchCandidates = await harvestFromSearchEngine(query, existingDomains);
    dynamicCandidatePool.push(...searchCandidates);
    queryIndex++;
  }

  // 3. Cào từ crt.sh nếu vẫn cần thêm
  if (dynamicCandidatePool.length < targetCount) {
    const crtCandidates = await harvestFromCrtSh("%25academy.%25.com", existingDomains);
    dynamicCandidatePool.push(...crtCandidates);
  }

  console.log(`[Dynamic Discovery] Thu thập được ${dynamicCandidatePool.length} ứng viên từ Internet.`);

  // 4. Thẩm định từng ứng viên bằng Platform Verifier
  const processedDomains = new Set<string>();

  for (const candidate of dynamicCandidatePool) {
    if (discovered.length >= targetCount) {
      break;
    }

    const domain = candidate.domainHint || new URL(candidate.url).hostname.toLowerCase();
    if (existingDomains.has(domain) || processedDomains.has(domain)) {
      continue;
    }
    processedDomains.add(domain);

    try {
      console.log(`-> Đang kiểm tra ứng viên trực tiếp từ web: ${candidate.url}`);
      const platformItem = await verifyAndExtractPlatform(candidate);
      if (platformItem) {
        discovered.push(platformItem);
        console.log(`   ✓ Hợp lệ: ${platformItem.name} (${platformItem.domain})`);
      }
    } catch (err) {
      console.error(`Lỗi khi kiểm tra ứng viên ${candidate.url}:`, err);
    }
  }

  // 5. Lưu các nền tảng mới vào data/platforms.json
  const { added, total } = appendPlatforms(discovered);

  return {
    requestedLimit: targetCount,
    addedCount: added.length,
    totalSaved: total,
    newPlatforms: added,
  };
}
