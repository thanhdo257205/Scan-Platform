import robotsParser from "robots-parser";
import { USER_AGENT } from "./config";
import { fetchText } from "./http";

export async function getRobots(baseUrl: string) {
  const origin = new URL(baseUrl).origin;
  const robotsUrl = `${origin}/robots.txt`;
  const result = await fetchText(robotsUrl);
  const parser = robotsParser(robotsUrl, result?.text || "");
  return parser;
}

export async function canFetch(baseUrl: string, url: string) {
  try {
    const robots = await getRobots(baseUrl);
    return robots.isAllowed(url, USER_AGENT) !== false;
  } catch {
    return true;
  }
}
