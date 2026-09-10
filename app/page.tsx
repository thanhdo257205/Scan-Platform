"use client";

import { useState, useEffect } from "react";
import { PlatformItem } from "@/lib/platform-types";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"platforms" | "courses">("platforms");

  // State cho Bước 1: Quét Nền Tảng
  const [platforms, setPlatforms] = useState<PlatformItem[]>([]);
  const [limit, setLimit] = useState<number>(5);
  const [isScanningPlatforms, setIsScanningPlatforms] = useState<boolean>(false);
  const [lastScanSummary, setLastScanSummary] = useState<string | null>(null);

  // State cho Bước 2: Quét Khóa Học chi tiết
  const [courseUrl, setCourseUrl] = useState("");
  const [courseResult, setCourseResult] = useState<any>(null);
  const [isScanningCourse, setIsScanningCourse] = useState(false);

  // Tải danh sách nền tảng đã lưu trong data/platforms.json khi vào trang
  useEffect(() => {
    fetchPlatforms();
  }, []);

  async function fetchPlatforms() {
    try {
      const res = await fetch("/api/platforms");
      const data = await res.json();
      if (data.platforms) {
        setPlatforms(data.platforms);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách nền tảng:", err);
    }
  }

  async function handleScanPlatforms() {
    if (limit <= 0) return;
    setIsScanningPlatforms(true);
    setLastScanSummary(null);

    try {
      const res = await fetch("/api/platforms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: Number(limit) }),
      });

      const data = await res.json();
      if (data.success) {
        setLastScanSummary(
          `Quét thành công! Tìm thấy thêm ${data.addedCount} nền tảng mới (đã tự động bỏ qua các nền tảng cũ). Tổng cộng trong file: ${data.totalSaved}`
        );
        fetchPlatforms();
      } else {
        setLastScanSummary(`Lỗi: ${data.error || "Không thể quét"}`);
      }
    } catch (err) {
      setLastScanSummary("Lỗi kết nối tới máy chủ khi quét nền tảng.");
    } finally {
      setIsScanningPlatforms(false);
    }
  }

  async function handleScanCourse(targetUrl?: string) {
    const urlToScan = targetUrl || courseUrl;
    if (!urlToScan) return;
    setCourseUrl(urlToScan);
    setActiveTab("courses");
    setIsScanningCourse(true);
    setCourseResult(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToScan, maxPages: 30 }),
      });
      setCourseResult(await response.json());
    } catch (err) {
      setCourseResult({ error: "Lỗi khi quét chi tiết khóa học" });
    } finally {
      setIsScanningCourse(false);
    }
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.badge}>Hệ Thống Rà Soát Nguồn Khóa Học Mở & E-Learning</div>
        <h1 style={styles.title}>Platform & Course Source Scanner</h1>
        <p style={styles.subtitle}>
          Tự động tìm kiếm các Nền tảng Đào tạo công nghệ (AWS, ServiceNow, IBM,...), lưu trữ dữ liệu khử trùng lặp và rà soát nguồn khóa học miễn phí.
        </p>
      </header>

      {/* Tabs */}
      <div style={styles.tabContainer}>
        <button
          style={{
            ...styles.tabButton,
            ...(activeTab === "platforms" ? styles.tabButtonActive : {}),
          }}
          onClick={() => setActiveTab("platforms")}
        >
          Bước 1: Quét Nền Tảng (Platform Discovery)
          <span style={styles.tabCount}>{platforms.length}</span>
        </button>
        <button
          style={{
            ...styles.tabButton,
            ...(activeTab === "courses" ? styles.tabButtonActive : {}),
          }}
          onClick={() => setActiveTab("courses")}
        >
          Bước 2: Quét Sâu Khóa Học / SCORM (Course Scanner)
        </button>
      </div>

      {/* TAB 1: QUÉT NỀN TẢNG */}
      {activeTab === "platforms" && (
        <section>
          {/* Card Bảng điều khiển */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Dò tìm Nền Tảng Mới & Cập nhật File</h2>
            <p style={styles.cardDesc}>
              Nhập số lượng nền tảng bạn muốn tìm thêm. Hệ thống sẽ tự động đọc file{" "}
              <code>data/platforms.json</code>, bỏ qua các nền tảng đã lưu và chỉ lấy những nền tảng mới.
            </p>

            <div style={styles.controlRow}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Số lượng nền tảng muốn lấy:</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  style={styles.inputNumber}
                  disabled={isScanningPlatforms}
                />
              </div>

              <button
                onClick={handleScanPlatforms}
                disabled={isScanningPlatforms}
                style={{
                  ...styles.primaryButton,
                  opacity: isScanningPlatforms ? 0.7 : 1,
                }}
              >
                {isScanningPlatforms ? "Đang quét và kiểm tra..." : `Tìm ${limit} Nền Tảng Mới`}
              </button>
            </div>

            {lastScanSummary && (
              <div
                style={{
                  ...styles.alert,
                  backgroundColor: lastScanSummary.includes("Lỗi") ? "#fff1f2" : "#f0fdf4",
                  borderColor: lastScanSummary.includes("Lỗi") ? "#fecdd3" : "#bbf7d0",
                  color: lastScanSummary.includes("Lỗi") ? "#9f1239" : "#166534",
                }}
              >
                {lastScanSummary}
              </div>
            )}
          </div>

          {/* Danh sách các nền tảng đã lưu */}
          <div style={{ marginTop: 30 }}>
            <div style={styles.listHeader}>
              <h3 style={{ margin: 0, fontSize: 20, color: "#1e293b" }}>
                Các Nền Tảng Đã Lưu ({platforms.length})
              </h3>
              <span style={styles.filePathBadge}>File: data/platforms.json</span>
            </div>

            {platforms.length === 0 ? (
              <div style={styles.emptyState}>
                Chưa có nền tảng nào được lưu. Hãy nhập số lượng ở trên và bấm <b>"Tìm Nền Tảng Mới"</b> để bắt đầu quét!
              </div>
            ) : (
              <div style={styles.grid}>
                {platforms.map((p, idx) => (
                  <div key={p.id || idx} style={styles.platformCard}>
                    <div style={styles.platformTop}>
                      <span style={styles.vendorBadge}>{p.vendor}</span>
                      {p.hasFreeOfferings && (
                        <span style={styles.freeBadge}>✓ Có Khóa Free</span>
                      )}
                    </div>

                    <h4 style={styles.platformName}>{p.name}</h4>
                    <div style={styles.domainText}>{p.domain}</div>
                    <p style={styles.platformDesc}>{p.description}</p>

                    <div style={styles.evidenceSection}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>
                        LMS Engine: {p.lmsEngine || "Portal"}
                      </span>
                    </div>

                    <div style={styles.cardActions}>
                      <a
                        href={p.catalogUrl || p.url}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.linkButton}
                      >
                        Mở Catalog ↗
                      </a>
                      <button
                        onClick={() => handleScanCourse(p.catalogUrl || p.url)}
                        style={styles.scanCourseButton}
                      >
                        Quét Khóa Học ➔
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 2: QUÉT SÂU KHÓA HỌC / SCORM */}
      {activeTab === "courses" && (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Quét Sâu Từng Khóa Học / SCORM Package</h2>
          <p style={styles.cardDesc}>
            Nhập trực tiếp URL trang khóa học hoặc trang danh mục để rà soát sitemap, bóc tách bằng chứng Open License và link download tài liệu.
          </p>

          <div style={styles.controlRow}>
            <input
              type="text"
              value={courseUrl}
              onChange={(e) => setCourseUrl(e.target.value)}
              placeholder="https://explore.skillbuilder.aws/learn/catalog"
              style={styles.inputText}
              disabled={isScanningCourse}
            />
            <button
              onClick={() => handleScanCourse()}
              disabled={isScanningCourse || !courseUrl}
              style={{
                ...styles.primaryButton,
                opacity: isScanningCourse || !courseUrl ? 0.7 : 1,
              }}
            >
              {isScanningCourse ? "Đang quét trang..." : "Bắt đầu quét"}
            </button>
          </div>

          {courseResult && (
            <div style={{ marginTop: 24 }}>
              <h4 style={{ marginBottom: 8 }}>Kết quả quét:</h4>
              <pre style={styles.codeOutput}>
                {JSON.stringify(courseResult, null, 2)}
              </pre>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 1150,
    margin: "30px auto",
    padding: "0 20px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    color: "#0f172a",
  },
  header: {
    textAlign: "center",
    marginBottom: 30,
  },
  badge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: 20,
    backgroundColor: "#e0f2fe",
    color: "#0369a1",
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 800,
    margin: "0 0 10px 0",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    color: "#475569",
    fontSize: 16,
    maxWidth: 700,
    margin: "0 auto",
    lineHeight: 1.5,
  },
  tabContainer: {
    display: "flex",
    gap: 12,
    borderBottom: "2px solid #e2e8f0",
    marginBottom: 25,
  },
  tabButton: {
    background: "none",
    border: "none",
    padding: "12px 18px",
    fontSize: 15,
    fontWeight: 600,
    color: "#64748b",
    cursor: "pointer",
    borderBottom: "3px solid transparent",
    marginBottom: -2,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  tabButtonActive: {
    color: "#2563eb",
    borderBottomColor: "#2563eb",
  },
  tabCount: {
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    padding: "2px 8px",
    borderRadius: 12,
    fontSize: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: "24px 28px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: "0 0 6px 0",
  },
  cardDesc: {
    color: "#475569",
    fontSize: 14,
    margin: "0 0 20px 0",
    lineHeight: 1.5,
  },
  controlRow: {
    display: "flex",
    gap: 16,
    alignItems: "flex-end",
    flexWrap: "wrap",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#334155",
  },
  inputNumber: {
    padding: "10px 14px",
    fontSize: 15,
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    width: 130,
    outline: "none",
  },
  inputText: {
    flex: 1,
    minWidth: 320,
    padding: "10px 14px",
    fontSize: 15,
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    outline: "none",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "11px 24px",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.15s",
  },
  alert: {
    marginTop: 18,
    padding: "12px 16px",
    borderRadius: 8,
    border: "1px solid",
    fontSize: 14,
    fontWeight: 500,
  },
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  filePathBadge: {
    fontSize: 12,
    color: "#64748b",
    backgroundColor: "#f1f5f9",
    padding: "4px 10px",
    borderRadius: 6,
    fontFamily: "monospace",
  },
  emptyState: {
    padding: 40,
    textAlign: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    border: "1px dashed #cbd5e1",
    color: "#64748b",
    fontSize: 15,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: 18,
  },
  platformCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  platformTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  vendorBadge: {
    backgroundColor: "#f1f5f9",
    color: "#334155",
    padding: "3px 8px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  freeBadge: {
    backgroundColor: "#dcfce7",
    color: "#15803d",
    padding: "3px 8px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
  },
  platformName: {
    fontSize: 17,
    fontWeight: 700,
    margin: "0 0 4px 0",
    color: "#0f172a",
  },
  domainText: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: "monospace",
    marginBottom: 8,
  },
  platformDesc: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 1.4,
    margin: "0 0 14px 0",
    flex: 1,
  },
  evidenceSection: {
    borderTop: "1px solid #f1f5f9",
    paddingTop: 10,
    marginBottom: 14,
  },
  cardActions: {
    display: "flex",
    gap: 8,
  },
  linkButton: {
    flex: 1,
    textAlign: "center",
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #cbd5e1",
    color: "#334155",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 600,
  },
  scanCourseButton: {
    flex: 1,
    padding: "8px 12px",
    borderRadius: 6,
    border: "none",
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  codeOutput: {
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    padding: 16,
    borderRadius: 8,
    fontSize: 13,
    overflowX: "auto",
    maxHeight: 400,
  },
};
