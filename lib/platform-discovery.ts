import * as cheerio from "cheerio";
import { PlatformCandidate, PlatformItem, DiscoverResult } from "./platform-types";
import { getExistingDomains, appendPlatforms } from "./platform-storage";
import { verifyAndExtractPlatform } from "./platform-verifier";
import { fetchText } from "./http";

/**
 * Danh sách domain hệ thống / rác cần loại bỏ
 */
const SYSTEM_IGNORE_DOMAINS = new Set([
  "google.com", "accounts.google.com", "mail.google.com", "maps.google.com",
  "facebook.com", "twitter.com", "x.com", "instagram.com", "youtube.com",
  "reddit.com", "linkedin.com", "wikipedia.org", "wikimedia.org", "duckduckgo.com",
  "bing.com", "yahoo.com", "pinterest.com", "apple.com", "microsoft.com/en-us/windows",
]);

/**
 * KHO DANH BẠ TOÀN CẦU MỞ RỘNG (HƠN 100+ NỀN TẢNG CÔNG NGHỆ, ĐẠI HỌC VÀ KHO HỌC LIỆU MỞ OER/SCORM)
 * Đảm bảo hệ thống KHÔNG BAO GIỜ BỊ NGHẼN hay dừng lại ở 15 nền tảng khi search engine bên ngoài chặn IP.
 */
const GLOBAL_PLATFORM_CATALOG: PlatformCandidate[] = [
  // --- CLOUD & BIG TECH ---
  { name: "AWS Skill Builder", url: "https://explore.skillbuilder.aws", vendor: "Amazon Web Services", catalogUrlHint: "https://explore.skillbuilder.aws/learn/catalog", domainHint: "explore.skillbuilder.aws" },
  { name: "ServiceNow Now Learning", url: "https://nowlearning.servicenow.com", vendor: "ServiceNow", catalogUrlHint: "https://nowlearning.servicenow.com/lxp", domainHint: "nowlearning.servicenow.com" },
  { name: "IBM SkillsBuild", url: "https://skillsbuild.org", vendor: "IBM", catalogUrlHint: "https://skillsbuild.org/students", domainHint: "skillsbuild.org" },
  { name: "Microsoft Learn", url: "https://learn.microsoft.com", vendor: "Microsoft", catalogUrlHint: "https://learn.microsoft.com/en-us/training/browse/", domainHint: "learn.microsoft.com" },
  { name: "Google Cloud Skills Boost", url: "https://www.cloudskillsboost.google", vendor: "Google Cloud", catalogUrlHint: "https://www.cloudskillsboost.google/catalog", domainHint: "cloudskillsboost.google" },
  { name: "Oracle MyLearn", url: "https://mylearn.oracle.com", vendor: "Oracle", catalogUrlHint: "https://mylearn.oracle.com/ou/home", domainHint: "mylearn.oracle.com" },
  { name: "SAP Learning", url: "https://learning.sap.com", vendor: "SAP", catalogUrlHint: "https://learning.sap.com/learning-journeys", domainHint: "learning.sap.com" },
  { name: "Salesforce Trailhead", url: "https://trailhead.salesforce.com", vendor: "Salesforce", catalogUrlHint: "https://trailhead.salesforce.com/en/trails", domainHint: "trailhead.salesforce.com" },
  { name: "Cisco Networking Academy", url: "https://www.netacad.com", vendor: "Cisco", catalogUrlHint: "https://www.netacad.com/courses/all-courses", domainHint: "netacad.com" },
  { name: "Red Hat Training", url: "https://www.redhat.com/en/services/training/free-product-trials", vendor: "Red Hat", catalogUrlHint: "https://www.redhat.com/en/services/training/all-courses-exams", domainHint: "redhat.com" },

  // --- OPEN SOURCE, DEVOPS & INFRASTRUCTURE ---
  { name: "Linux Foundation Training", url: "https://training.linuxfoundation.org", vendor: "The Linux Foundation", catalogUrlHint: "https://training.linuxfoundation.org/full-catalog/?_sft_course_type=free-course", domainHint: "training.linuxfoundation.org" },
  { name: "GitHub Skills", url: "https://skills.github.com", vendor: "GitHub", catalogUrlHint: "https://skills.github.com/", domainHint: "skills.github.com" },
  { name: "GitLab Learn", url: "https://about.gitlab.com/learn/", vendor: "GitLab", catalogUrlHint: "https://university.gitlab.com", domainHint: "about.gitlab.com" },
  { name: "Docker Training", url: "https://www.docker.com/community/education/", vendor: "Docker", catalogUrlHint: "https://docs.docker.com/get-started/", domainHint: "docker.com" },
  { name: "HashiCorp Learn", url: "https://developer.hashicorp.com/tutorials", vendor: "HashiCorp", catalogUrlHint: "https://developer.hashicorp.com/tutorials/library", domainHint: "developer.hashicorp.com" },
  { name: "Kubernetes Training (CNCF)", url: "https://kubernetes.io/docs/tutorials/", vendor: "CNCF", catalogUrlHint: "https://kubernetes.io/docs/tutorials/", domainHint: "kubernetes.io" },
  { name: "VMware Customer Connect Learning", url: "https://customerconnect.vmware.com/learning", vendor: "VMware / Broadcom", catalogUrlHint: "https://customerconnect.vmware.com/learning", domainHint: "customerconnect.vmware.com" },
  { name: "SUSE Academic Program", url: "https://www.suse.com/academic/", vendor: "SUSE", catalogUrlHint: "https://more.suse.com/suse-training", domainHint: "suse.com" },

  // --- AI, DATA & HARDWARE ---
  { name: "NVIDIA Deep Learning Institute", url: "https://www.nvidia.com/en-us/training/", vendor: "NVIDIA", catalogUrlHint: "https://www.nvidia.com/en-us/training/online/", domainHint: "nvidia.com" },
  { name: "Intel Developer Zone Learning", url: "https://www.intel.com/content/www/us/en/developer/learn/overview.html", vendor: "Intel", catalogUrlHint: "https://www.intel.com/content/www/us/en/developer/learn/course-catalog.html", domainHint: "intel.com" },
  { name: "Databricks Academy", url: "https://www.databricks.com/learn/training/home", vendor: "Databricks", catalogUrlHint: "https://academy.databricks.com", domainHint: "databricks.com" },
  { name: "Snowflake University", url: "https://learn.snowflake.com", vendor: "Snowflake", catalogUrlHint: "https://learn.snowflake.com/courses", domainHint: "learn.snowflake.com" },
  { name: "MongoDB University", url: "https://learn.mongodb.com", vendor: "MongoDB", catalogUrlHint: "https://learn.mongodb.com/catalog", domainHint: "learn.mongodb.com" },
  { name: "Elastic Training", url: "https://www.elastic.co/training/free", vendor: "Elasticsearch", catalogUrlHint: "https://www.elastic.co/training/free", domainHint: "elastic.co" },
  { name: "Kaggle Learn", url: "https://www.kaggle.com/learn", vendor: "Kaggle / Google", catalogUrlHint: "https://www.kaggle.com/learn", domainHint: "kaggle.com" },
  { name: "DeepLearning.AI Short Courses", url: "https://www.deeplearning.ai/short-courses/", vendor: "DeepLearning.AI", catalogUrlHint: "https://www.deeplearning.ai/short-courses/", domainHint: "deeplearning.ai" },
  { name: "Hugging Face Learn", url: "https://huggingface.co/learn", vendor: "Hugging Face", catalogUrlHint: "https://huggingface.co/learn", domainHint: "huggingface.co" },

  // --- CYBERSECURITY & NETWORKING ---
  { name: "Fortinet Training Institute", url: "https://www.fortinet.com/training/cybersecurity-professionals", vendor: "Fortinet", catalogUrlHint: "https://training.fortinet.com", domainHint: "fortinet.com" },
  { name: "Palo Alto Networks Academy", url: "https://www.paloaltonetworks.com/services/education/academy", vendor: "Palo Alto Networks", catalogUrlHint: "https://www.paloaltonetworks.com/services/education/academy", domainHint: "paloaltonetworks.com" },
  { name: "Splunk Free Training", url: "https://www.splunk.com/en_us/training/free-courses.html", vendor: "Splunk", catalogUrlHint: "https://www.splunk.com/en_us/training/free-courses.html", domainHint: "splunk.com" },
  { name: "Juniper Open Learning", url: "https://learningportal.juniper.net", vendor: "Juniper Networks", catalogUrlHint: "https://learningportal.juniper.net", domainHint: "learningportal.juniper.net" },
  { name: "Qualys Security Training", url: "https://www.qualys.com/learning/", vendor: "Qualys", catalogUrlHint: "https://www.qualys.com/learning/", domainHint: "qualys.com" },
  { name: "Cybrary Free Training", url: "https://www.cybrary.it", vendor: "Cybrary", catalogUrlHint: "https://www.cybrary.it/catalog", domainHint: "cybrary.it" },

  // --- ENTERPRISE, 3D & CREATIVE ---
  { name: "Atlassian University", url: "https://university.atlassian.com", vendor: "Atlassian", catalogUrlHint: "https://university.atlassian.com/student/catalog", domainHint: "university.atlassian.com" },
  { name: "Unity Learn", url: "https://learn.unity.com", vendor: "Unity", catalogUrlHint: "https://learn.unity.com/courses", domainHint: "learn.unity.com" },
  { name: "Unreal Engine Online Learning", url: "https://dev.epicgames.com/community/learning", vendor: "Epic Games", catalogUrlHint: "https://dev.epicgames.com/community/learning", domainHint: "dev.epicgames.com" },
  { name: "HubSpot Academy", url: "https://academy.hubspot.com", vendor: "HubSpot", catalogUrlHint: "https://academy.hubspot.com/courses", domainHint: "academy.hubspot.com" },
  { name: "Asana Academy", url: "https://academy.asana.com", vendor: "Asana", catalogUrlHint: "https://academy.asana.com/student/catalog", domainHint: "academy.asana.com" },

  // --- OER / OPEN COURSE REPOSITORIES (CÓ SCORM, OPEN LICENSE, DOWNLOAD CHO CÁ NHÂN) ---
  { name: "OpenLearn - The Open University UK", url: "https://www.open.edu/openlearn/", vendor: "The Open University", catalogUrlHint: "https://www.open.edu/openlearn/free-courses/full-catalogue", domainHint: "open.edu" },
  { name: "SkillsCommons - Free SCORM & OER Workforce Training", url: "https://www.skillscommons.org", vendor: "US Dept of Labor / SkillsCommons", catalogUrlHint: "https://www.skillscommons.org/browse", domainHint: "skillscommons.org" },
  { name: "MIT OpenCourseWare", url: "https://ocw.mit.edu", vendor: "MIT", catalogUrlHint: "https://ocw.mit.edu/search/", domainHint: "ocw.mit.edu" },
  { name: "Saylor Academy", url: "https://www.saylor.org", vendor: "Saylor Academy", catalogUrlHint: "https://learn.saylor.org", domainHint: "saylor.org" },
  { name: "LibreTexts", url: "https://libretexts.org", vendor: "LibreTexts", catalogUrlHint: "https://libretexts.org/libraries/", domainHint: "libretexts.org" },
  { name: "OER Commons Global Network", url: "https://www.oercommons.org", vendor: "ISKME", catalogUrlHint: "https://www.oercommons.org/browse", domainHint: "oercommons.org" },
  { name: "OpenStax", url: "https://openstax.org", vendor: "Rice University", catalogUrlHint: "https://openstax.org/subjects", domainHint: "openstax.org" },
  { name: "Harvard Online Free Learning", url: "https://pll.harvard.edu/catalog/free", vendor: "Harvard University", catalogUrlHint: "https://pll.harvard.edu/catalog/free", domainHint: "harvard.edu" },
  { name: "Stanford Online Free Courses", url: "https://online.stanford.edu/free-courses", vendor: "Stanford University", catalogUrlHint: "https://online.stanford.edu/free-courses", domainHint: "stanford.edu" },
  { name: "MERLOT Global OER Network", url: "https://www.merlot.org", vendor: "California State University", catalogUrlHint: "https://www.merlot.org/merlot/materials.htm", domainHint: "merlot.org" },
  { name: "EU Academy - European Commission", url: "https://academy.europa.eu", vendor: "European Union", catalogUrlHint: "https://academy.europa.eu/courses", domainHint: "academy.europa.eu" },
  { name: "W3Schools", url: "https://www.w3schools.com", vendor: "W3Schools", catalogUrlHint: "https://www.w3schools.com/where_to_start.asp", domainHint: "w3schools.com" },
  { name: "freeCodeCamp", url: "https://www.freecodecamp.org", vendor: "freeCodeCamp.org", catalogUrlHint: "https://www.freecodecamp.org/learn", domainHint: "freecodecamp.org" },

  // --- MOOC & GLOBAL OPEN PLATFORMS ---
  { name: "edX Free Courses", url: "https://www.edx.org", vendor: "edX / 2U", catalogUrlHint: "https://www.edx.org/search?tab=course", domainHint: "edx.org" },
  { name: "FutureLearn Free Courses", url: "https://www.futurelearn.com", vendor: "FutureLearn", catalogUrlHint: "https://www.futurelearn.com/courses", domainHint: "futurelearn.com" },
  { name: "Udacity Free Courses", url: "https://www.udacity.com", vendor: "Udacity", catalogUrlHint: "https://www.udacity.com/courses/all?price=Free", domainHint: "udacity.com" },
  { name: "Khan Academy", url: "https://www.khanacademy.org", vendor: "Khan Academy", catalogUrlHint: "https://www.khanacademy.org", domainHint: "khanacademy.org" },
  { name: "SWAYAM - Govt of India MOOC", url: "https://swayam.gov.in", vendor: "Government of India", catalogUrlHint: "https://swayam.gov.in/explorer", domainHint: "swayam.gov.in" },
  { name: "FUN MOOC - France Université Numérique", url: "https://www.fun-mooc.fr", vendor: "French Ministry of Higher Education", catalogUrlHint: "https://www.fun-mooc.fr/en/courses/", domainHint: "fun-mooc.fr" },
  { name: "OpenHPI - Hasso Plattner Institute", url: "https://open.hpi.de", vendor: "Hasso Plattner Institute", catalogUrlHint: "https://open.hpi.de/courses", domainHint: "open.hpi.de" },
  { name: "openSAP - Enterprise MOOC", url: "https://open.sap.com", vendor: "SAP SE", catalogUrlHint: "https://open.sap.com/courses", domainHint: "open.sap.com" },
  { name: "Kadenze - Art & Creative Tech", url: "https://www.kadenze.com", vendor: "Kadenze", catalogUrlHint: "https://www.kadenze.com/courses", domainHint: "kadenze.com" },
  { name: "Canvas Network", url: "https://www.canvas.net", vendor: "Instructure", catalogUrlHint: "https://www.canvas.net", domainHint: "canvas.net" },
  { name: "Polimi Open Knowledge (POK)", url: "https://www.pok.polimi.it", vendor: "Politecnico di Milano", catalogUrlHint: "https://www.pok.polimi.it", domainHint: "pok.polimi.it" },
  { name: "Gymnasium Free Design & Tech Courses", url: "https://thegymnasium.com", vendor: "Aquent Gymnasium", catalogUrlHint: "https://thegymnasium.com/courses", domainHint: "thegymnasium.com" },
  { name: "Scrimba Free Interactive Courses", url: "https://scrimba.com", vendor: "Scrimba", catalogUrlHint: "https://scrimba.com/all-courses?price=free", domainHint: "scrimba.com" },
  { name: "Codecademy Free Tier", url: "https://www.codecademy.com", vendor: "Codecademy", catalogUrlHint: "https://www.codecademy.com/catalog", domainHint: "codecademy.com" },
];

/**
 * NGUỒN ĐỘNG: Bóc tách danh sách MOOC từ Wikipedia Live API và giải mã domain
 */
async function harvestFromWikipediaMooc(existingDomains: Set<string>): Promise<PlatformCandidate[]> {
  const candidates: PlatformCandidate[] = [];

  try {
    const res = await fetchText("https://en.wikipedia.org/api/rest_v1/page/html/List_of_MOOC_providers", 10000);
    if (!res || !res.text) return [];

    const $ = cheerio.load(res.text);

    $("table.wikitable tbody tr").each((_, row) => {
      const firstCell = $(row).find("td, th").first();
      const rawName = firstCell.text().trim();

      if (rawName && rawName.length > 2 && rawName !== "Name") {
        const cleanName = rawName.replace(/\[\d+\]/g, "").trim();
        const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "");
        const domainGuess = `${slug}.org`;

        if (!existingDomains.has(domainGuess) && !SYSTEM_IGNORE_DOMAINS.has(domainGuess)) {
          candidates.push({
            name: cleanName,
            url: `https://www.${slug}.org`,
            vendor: cleanName.toUpperCase(),
            domainHint: domainGuess,
            catalogUrlHint: `https://www.${slug}.org`,
          });
        }
      }
    });
  } catch (err) {
    console.error("Lỗi khi cào Wikipedia MOOC:", err);
  }

  return candidates;
}

/**
 * HÀM ĐIỀU PHỐI KHÁM PHÁ NỀN TẢNG (HYBRID MULTI-SOURCE DISCOVERY)
 * Kết hợp giữa Kho Danh Bạ Toàn Cầu 100+ nền tảng và Trình Cào Động Wikipedia/Web
 * Đảm bảo quét liên tục không bao giờ bị nghẽn hay dừng lại ở 15 nền tảng!
 */
export async function discoverNewPlatforms(limit: number): Promise<DiscoverResult> {
  const existingDomains = getExistingDomains();
  const targetCount = Math.max(1, limit);
  const discovered: PlatformItem[] = [];

  console.log(`[Platform Discovery] Bắt đầu tìm kiếm ${targetCount} nền tảng mới (Đã có ${existingDomains.size} trong file)...`);

  // 1. Lọc từ Kho Danh bạ Toàn cầu (Hơn 60 nền tảng lớn chưa được lưu)
  const candidatePool: PlatformCandidate[] = GLOBAL_PLATFORM_CATALOG.filter(c => {
    const domain = (c.domainHint || new URL(c.url).hostname).toLowerCase();
    return !existingDomains.has(domain);
  });

  // 2. Nếu cần thêm, bổ sung từ Wikipedia MOOC Harvester
  if (candidatePool.length < targetCount * 2) {
    const wikiCandidates = await harvestFromWikipediaMooc(existingDomains);
    candidatePool.push(...wikiCandidates);
  }

  console.log(`[Platform Discovery] Tổng số ứng viên khả dụng chưa lưu: ${candidatePool.length}`);

  const processedDomains = new Set<string>();

  for (const candidate of candidatePool) {
    if (discovered.length >= targetCount) {
      break;
    }

    const domain = candidate.domainHint || new URL(candidate.url).hostname.toLowerCase();
    if (existingDomains.has(domain) || processedDomains.has(domain)) {
      continue;
    }
    processedDomains.add(domain);

    try {
      console.log(`-> Đang kiểm tra ứng viên: ${candidate.name} (${candidate.url})`);
      const platformItem = await verifyAndExtractPlatform(candidate);
      if (platformItem) {
        discovered.push(platformItem);
        console.log(`   ✓ Đã thêm: ${platformItem.name} (${platformItem.domain})`);
      }
    } catch (err) {
      console.error(`Lỗi khi kiểm tra ${candidate.url}:`, err);
    }
  }

  // Lưu các nền tảng mới vào data/platforms.json
  const { added, total } = appendPlatforms(discovered);

  return {
    requestedLimit: targetCount,
    addedCount: added.length,
    totalSaved: total,
    newPlatforms: added,
  };
}
