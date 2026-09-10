# Next.js Course / SCORM Source Scanner

Chuyển từ `discover_platforms.py` + `scan_open_courses.py` sang Next.js/Node.js.

## Mục tiêu

Tìm **source URL**, không tải course/package về.

Scanner ưu tiên phát hiện:
- COURSE / Open Course
- SCORM / SCORM 1.2 / SCORM 2004
- SCO / Learning Object
- H5P
- Interactive learning

Sau đó thu thập bằng chứng về:
- license / Creative Commons / OER
- download / offline / package
- các link liên quan

> `score` chỉ là điểm bằng chứng, không phải kết luận pháp lý rằng nội dung được phép redistribute.

## Cài đặt

```bash
npm install
npm run dev
```

## API

### Discover

```http
POST /api/discover
Content-Type: application/json
```

Body:

```json
{
  "maxPerDirectory": 100
}
```

### Scan một source

```http
POST /api/scan
Content-Type: application/json
```

Body:

```json
{
  "url": "https://example.org",
  "maxPages": 50
}
```

## Ghi chú

Phiên bản này cố ý không download `.zip`, `.h5p` hoặc SCORM package. Nó chỉ đọc HTML/sitemap để tìm **source và evidence**.

Production nên thêm:
- queue/background worker thay vì giữ HTTP request lâu
- persistent database
- rate limiting
- cache
- robots.txt policy/cache
- search-engine discovery
- retry/backoff
- dedup theo domain
- confidence scoring riêng cho COURSE/SCORM/H5P/license/download
