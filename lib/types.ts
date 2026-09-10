export type ContentType = "COURSE" | "SCORM" | "SCO" | "H5P" | "INTERACTIVE";

export interface SourceResult {
  url: string;
  domain: string;
  title: string;
  contentTypes: ContentType[];
  score: number;
  evidence: string[];
  licenseEvidence: string[];
  downloadEvidence: string[];
  relevantLinks: string[];
}
