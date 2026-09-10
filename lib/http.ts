import { USER_AGENT } from "./config";

export async function fetchText(url: string, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xml,text/xml,*/*",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) return null;
    return {
      text: await response.text(),
      contentType: response.headers.get("content-type") || "",
      finalUrl: response.url,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
