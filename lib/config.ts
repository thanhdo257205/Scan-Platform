export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 (compatible; CourseScanner/2.0)";

export const DIRECTORY_SOURCES = [
  "https://www.oercommons.org/hubs",
  "https://v2.sherpa.ac.uk/opendoar/",
  "https://en.wikipedia.org/wiki/Open_educational_resources",
  "https://creativecommons.org/about/platform/",
];

export const IGNORE_DOMAINS = [
  "facebook.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "instagram.com",
  "youtube.com",
  "wikipedia.org",
  "wikimedia.org",
  "creativecommons.org/licenses",
  "doi.org",
  "pubmed.ncbi.nlm.nih.gov",
  "arxiv.org",
  "nytimes.com",
  "theguardian.com",
];

/**
 * Danh sách đường dẫn URL KHÔNG PHẢI KHÓA HỌC (Blacklist URL Patterns)
 * Loại bỏ ngay lập tức các bài viết blog, báo cáo nghiên cứu, trang mua subscription, trang điều khoản.
 */
export const NON_COURSE_URL_PATTERNS = [
  "/blog/", "/blogs/", "/news/", "/article/", "/articles/", "/press/",
  "/about/", "/about-us", "/contact", "/careers/", "/jobs/",
  "/terms", "/privacy", "/legal/", "/security/",
  "/pricing", "/subscriptions", "/subscription", "/checkout", "/billing",
  "/faq", "/faqs", "/support", "/help/", "/community", "/forum",
  "/events/", "/event/", "/webinar", "/webinars",
  "/whitepaper", "/whitepapers", "/research/", "/case-study", "/case-studies",
  "/misc/", "/files/misc/", "/wp-content/uploads/",
];

/**
 * Dấu hiệu hành động Đăng ký / Bắt đầu học (Enroll / Action CTA)
 */
export const ENROLL_CTA_KEYWORDS = [
  "enroll", "enroll now", "register now", "start learning", "start course",
  "start module", "take course", "take this course", "join for free",
  "start free course", "launch course", "go to course", "start now",
  "bắt đầu học", "đăng ký ngay", "đăng ký học", "tham gia khóa học",
];

/**
 * Dấu hiệu cấu trúc bài giảng / Đề cương khóa học (Syllabus / Curriculum)
 */
export const SYLLABUS_KEYWORDS = [
  "syllabus", "curriculum", "course outline", "what you will learn",
  "table of contents", "learning objectives", "course content",
  "modules", "lessons", "lectures", "module 1", "lesson 1", "chapter 1",
];

export const COURSE_KEYWORDS = [
  "online course", "open course", "free course", "courses", "courseware",
  "open courseware", "learning materials", "course repository",
];

export const SCORM_KEYWORDS = [
  "scorm", "scorm 1.2", "scorm 2004", "scorm package",
  "scorm course", "imsmanifest.xml",
];

export const SCO_KEYWORDS = [
  "sco", "sharable content object", "learning object",
  "learning object repository",
];

export const H5P_KEYWORDS = [
  "h5p", "interactive content", "h5p activities", "h5p content",
];

export const INTERACTIVE_KEYWORDS = [
  "interactive course", "interactive learning",
  "interactive learning object", "interactive content",
];

export const LICENSE_KEYWORDS = [
  "creativecommons.org", "creative commons", "cc by", "cc-by",
  "cc by-sa", "cc-by-sa", "cc by-nc", "cc-by-nc",
  "public domain", "open license", "open educational resource", "oer",
];

export const DOWNLOAD_KEYWORDS = [
  "download", "download course", "download package",
  "download scorm", "download h5p", "offline",
  "available for download", "personal use",
];

export const FILE_EXTENSIONS = [
  ".h5p", ".zip", ".scorm", ".ims", ".pdf", ".epub",
];
