import fs from "fs";
import path from "path";
import { PlatformItem } from "./platform-types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORAGE_FILE = path.join(DATA_DIR, "platforms.json");

function ensureStorageFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORAGE_FILE)) {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

export function loadPlatforms(): PlatformItem[] {
  try {
    ensureStorageFile();
    const raw = fs.readFileSync(STORAGE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error reading platforms storage:", error);
    return [];
  }
}

export function getExistingDomains(): Set<string> {
  const platforms = loadPlatforms();
  const domains = new Set<string>();
  for (const item of platforms) {
    if (item.domain) {
      domains.add(item.domain.toLowerCase());
    }
  }
  return domains;
}

export function savePlatforms(platforms: PlatformItem[]): void {
  ensureStorageFile();
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(platforms, null, 2), "utf-8");
}

export function appendPlatforms(newPlatforms: PlatformItem[]): {
  added: PlatformItem[];
  total: number;
} {
  const current = loadPlatforms();
  const existingDomains = new Set(current.map(p => p.domain.toLowerCase()));
  const existingIds = new Set(current.map(p => p.id));

  const trulyNew: PlatformItem[] = [];
  for (const item of newPlatforms) {
    const domainKey = item.domain.toLowerCase();
    if (!existingDomains.has(domainKey) && !existingIds.has(item.id)) {
      existingDomains.add(domainKey);
      existingIds.add(item.id);
      trulyNew.push(item);
    }
  }

  if (trulyNew.length > 0) {
    const updated = [...current, ...trulyNew];
    savePlatforms(updated);
    return { added: trulyNew, total: updated.length };
  }

  return { added: [], total: current.length };
}
