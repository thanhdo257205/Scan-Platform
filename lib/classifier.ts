import * as cheerio from "cheerio";
import {
  COURSE_KEYWORDS, SCORM_KEYWORDS, SCO_KEYWORDS, H5P_KEYWORDS,
  INTERACTIVE_KEYWORDS, LICENSE_KEYWORDS, DOWNLOAD_KEYWORDS, FILE_EXTENSIONS,
  NON_COURSE_URL_PATTERNS, ENROLL_CTA_KEYWORDS, SYLLABUS_KEYWORDS,
} from "./config";
import { SourceResult } from "./types";

const hit = (text: string, keywords: string[]) =>
  keywords.filter(k => text.includes(k));

export function classifyPage(url: string, html: string): SourceResult {
  const lowerUrl = url.toLowerCase();

  // TẦNG 1: KIỂM TRA BLACKLIST URL
  // Nếu URL thuộc các trang blog, news, chính sách, mua subscription... thì loại ngay
  const isBlacklistedUrl = NON_COURSE_URL_PATTERNS.some(p => lowerUrl.includes(p));

  const emptyResult: SourceResult = {
    url,
    domain: new URL(url).hostname,
    title: "",
    contentTypes: [],
    score: 0,
    evidence: [],
    licenseEvidence: [],
    downloadEvidence: [],
    relevantLinks: [],
  };

  if (isBlacklistedUrl) {
    return emptyResult;
  }

  const $ = cheerio.load(html);
  const text = $("body").text().replace(/\s+/g, " ").toLowerCase();
  const allText = `${$("html").html() || ""} ${text}`.toLowerCase();
  const rawHtml = (html || "").toLowerCase();

  // TẦNG 2: KIỂM TRA DẤU HIỆU HÀNH ĐỘNG HỌC (ENROLL / ACTION CTA)
  let hasEnrollAction = false;
  // Quét các nút bấm, link dạng button hoặc text nổi bật
  $("button, a.btn, a[class*='button'], a[class*='btn'], a[class*='enroll'], input[type='submit'], [role='button']").each((_, el) => {
    const btnText = $(el).text().trim().toLowerCase();
    if (ENROLL_CTA_KEYWORDS.some(kw => btnText.includes(kw))) {
      hasEnrollAction = true;
      return false; // Dừng vòng lặp
    }
  });

  // Nếu trong nút bấm chưa có, kiểm tra thêm trong 2000 ký tự đầu của body text
  if (!hasEnrollAction) {
    const topBodyText = text.slice(0, 3000);
    if (ENROLL_CTA_KEYWORDS.some(kw => topBodyText.includes(kw))) {
      hasEnrollAction = true;
    }
  }

  // TẦNG 3: KIỂM TRA ĐỀ CƯƠNG BÀI GIẢNG (SYLLABUS / CURRICULUM)
  let hasSyllabus = false;
  $("h1, h2, h3, h4, h5, .syllabus, .curriculum, [class*='syllabus'], [class*='curriculum']").each((_, el) => {
    const headingText = $(el).text().trim().toLowerCase();
    if (SYLLABUS_KEYWORDS.some(kw => headingText.includes(kw))) {
      hasSyllabus = true;
      return false;
    }
  });

  // KIỂM TRA VIDEO PLAYER HOẶC EMBED
  let hasVideoOrPlayer = false;
  if ($("video").length > 0) {
    hasVideoOrPlayer = true;
  }
  $("iframe[src]").each((_, el) => {
    const src = ($(el).attr("src") || "").toLowerCase();
    if (
      src.includes("youtube") ||
      src.includes("vimeo") ||
      src.includes("wistia") ||
      src.includes("kaltura") ||
      src.includes("brightcove") ||
      src.includes("player")
    ) {
      hasVideoOrPlayer = true;
      return false;
    }
  });

  // KIỂM TRA SCORM & H5P
  const scormHits = hit(allText, SCORM_KEYWORDS);
  const isScormRuntime = rawHtml.includes("imsmanifest.xml") ||
                         rawHtml.includes("lmsinitialize") ||
                         rawHtml.includes("api_1484_11");
  const isScorm = scormHits.length > 0 || isScormRuntime;

  const h5pHits = hit(allText, H5P_KEYWORDS);
  const isH5pRuntime = rawHtml.includes(".h5p-content") || rawHtml.includes("h5p.js");
  const isH5p = h5pHits.length > 0 || isH5pRuntime;

  // KIỂM TRA SCHEMA.ORG COURSE METADATA
  let isJsonLdCourse = false;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const jsonContent = $(el).html() || "";
      if (jsonContent.includes('"Course"') || jsonContent.includes('"CourseInstance"')) {
        isJsonLdCourse = true;
        return false;
      }
    } catch {}
  });

  // ĐIỀU KIỆN CHẶT CHẼ ĐỂ ĐƯỢC COI LÀ KHÓA HỌC THỰC THỤ:
  // Trang web bắt buộc phải có ít nhất MỘT trong các dấu hiệu bài giảng cụ thể:
  const isGenuineCourse =
    hasEnrollAction ||
    hasVideoOrPlayer ||
    hasSyllabus ||
    isScorm ||
    isH5p ||
    isJsonLdCourse;

  // Nếu chỉ là trang web ngẫu nhiên có chữ "courses" trong menu mà không có các dấu hiệu trên -> LOẠI BỎ
  if (!isGenuineCourse) {
    return emptyResult;
  }

  // Quét các từ khóa khác
  const courseHits = hit(text, COURSE_KEYWORDS);
  const scoHits = hit(text, SCO_KEYWORDS);
  const interactiveHits = hit(text, INTERACTIVE_KEYWORDS);
  const licenseHits = hit(allText, LICENSE_KEYWORDS);
  const downloadHits = hit(allText, DOWNLOAD_KEYWORDS);

  const relevantLinks: string[] = [];
  const downloadEvidence: string[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    try {
      const absolute = new URL(href, url).href;
      const label = $(el).text().trim().toLowerCase();
      const combined = `${absolute} ${label}`.toLowerCase();

      if (FILE_EXTENSIONS.some(ext => absolute.toLowerCase().split("?")[0].endsWith(ext))) {
        downloadEvidence.push(`file link: ${absolute}`);
      }
      if (/course|scorm|sco|h5p|interactive|learning|oer/.test(combined)) {
        relevantLinks.push(absolute);
      }
    } catch {}
  });

  const contentTypes = [
    (courseHits.length || hasEnrollAction || hasSyllabus) ? "COURSE" : null,
    isScorm ? "SCORM" : null,
    scoHits.length ? "SCO" : null,
    isH5p ? "H5P" : null,
    (interactiveHits.length || hasVideoOrPlayer) ? "INTERACTIVE" : null,
  ].filter(Boolean) as SourceResult["contentTypes"];

  // Xác định định dạng bài giảng cụ thể
  let courseFormat: SourceResult["courseFormat"] = "STRUCTURED_LESSON";
  if (isScorm) {
    courseFormat = "SCORM";
  } else if (isH5p) {
    courseFormat = "H5P";
  } else if (hasVideoOrPlayer) {
    courseFormat = "VIDEO_COURSE";
  } else if (interactiveHits.length > 0) {
    courseFormat = "INTERACTIVE";
  }

  // Tính điểm bằng chứng (Score)
  let score = 20; // Base score cho trang đã được xác nhận là khóa học thật
  if (hasEnrollAction) score += 15;
  if (hasVideoOrPlayer) score += 15;
  if (hasSyllabus) score += 15;
  if (isScorm) score += 25;
  if (isH5p) score += 20;
  if (licenseHits.length) score += Math.min(licenseHits.length * 5, 15);
  if (downloadHits.length) score += Math.min(downloadHits.length * 5, 15);
  if (downloadEvidence.length) score += Math.min(downloadEvidence.length * 8, 16);

  const title = $("title").first().text().trim();

  const evidence: string[] = [];
  if (hasEnrollAction) evidence.push("Có nút Đăng ký học (Enroll / Start Learning)");
  if (hasVideoOrPlayer) evidence.push("Có Video Player bài giảng");
  if (hasSyllabus) evidence.push("Có Đề cương bài học (Syllabus/Curriculum)");
  if (isScorm) evidence.push("Chuẩn bài giảng SCORM");
  if (isH5p) evidence.push("Chuẩn bài giảng tương tác H5P");
  if (isJsonLdCourse) evidence.push("Chuẩn Schema.org Course");

  return {
    url,
    domain: new URL(url).hostname,
    title,
    contentTypes: [...new Set(contentTypes)],
    score: Math.min(score, 100),
    evidence: [...evidence, ...courseHits.map(x => `course keyword: ${x}`)],
    licenseEvidence: licenseHits.map(x => `license keyword: ${x}`),
    downloadEvidence: [
      ...downloadHits.map(x => `download keyword: ${x}`),
      ...downloadEvidence,
    ],
    relevantLinks: [...new Set(relevantLinks)].slice(0, 50),
    hasEnrollAction,
    hasVideoOrPlayer,
    hasSyllabus,
    courseFormat,
  };
}
