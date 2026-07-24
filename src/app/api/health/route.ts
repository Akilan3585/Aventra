import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    service: "aventra-ai",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
