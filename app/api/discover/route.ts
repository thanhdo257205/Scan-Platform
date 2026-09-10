import { NextResponse } from "next/server";
import { discoverCandidates, verifySource } from "@/lib/discover";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const directories = Array.isArray(body.directories)
      ? body.directories
      : undefined;
    const maxPerDirectory = Number(body.maxPerDirectory || 100);

    const candidates = await discoverCandidates(directories, maxPerDirectory);
    const results = [];

    for (const url of candidates) {
      const result = await verifySource(url);
      if (result) results.push(result);
    }

    results.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      count: results.length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
