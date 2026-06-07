import { NextResponse } from "next/server";
import { clearDemandRecords, getDemandRecords } from "@/lib/demand-log/store";

export const runtime = "nodejs";

function sessionId(request: Request) {
  return new URL(request.url).searchParams.get("sessionId")?.trim() || "";
}

export async function GET(request: Request) {
  const id = sessionId(request);
  if (!id) return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  return NextResponse.json({ records: getDemandRecords(id) });
}

export async function DELETE(request: Request) {
  const id = sessionId(request);
  if (!id) return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  clearDemandRecords(id);
  return NextResponse.json({ cleared: true });
}
