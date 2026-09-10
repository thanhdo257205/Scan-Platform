export interface PlatformItem {
  id: string;
  name: string;
  domain: string;
  url: string;
  catalogUrl: string;
  vendor: string;
  description: string;
  hasFreeOfferings: boolean;
  lmsEngine?: string;
  evidence: string[];
  discoveredAt: string;
}

export interface PlatformCandidate {
  name: string;
  url: string;
  vendor: string;
  catalogUrlHint?: string;
  domainHint?: string;
}

export interface DiscoverOptions {
  limit: number;
}

export interface DiscoverResult {
  requestedLimit: number;
  addedCount: number;
  totalSaved: number;
  newPlatforms: PlatformItem[];
}
