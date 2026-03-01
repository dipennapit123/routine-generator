import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ versionId: string }> }
) {
  try {
    const { versionId } = await params;
    await prisma.routineVersion.updateMany({
      where: { status: "PUBLISHED" },
      data: { status: "ARCHIVED" },
    });
    await prisma.routineVersion.update({
      where: { id: versionId },
      data: { status: "PUBLISHED" },
    });
    return NextResponse.json({ ok: true, status: "PUBLISHED" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
  }
}
