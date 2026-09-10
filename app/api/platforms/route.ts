import { NextResponse } from "next/server";
import { loadPlatforms } from "@/lib/platform-storage";
import { discoverNewPlatforms } from "@/lib/platform-discovery";

export async function GET() {
  try {
    const platforms = loadPlatforms();
    return NextResponse.json({
      total: platforms.length,
      platforms,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = Math.max(1, Number(body.limit) || 5);

    const result = await discoverNewPlatforms(limit);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
