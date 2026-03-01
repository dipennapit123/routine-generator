import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ versionId: string }> }
) {
  try {
    const { versionId } = await params;
    await prisma.routineVersion.update({
      where: { id: versionId },
      data: { status: "ARCHIVED" },
    });
    return NextResponse.json({ ok: true, status: "ARCHIVED" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to archive" }, { status: 500 });
  }
}
