import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = body as {
      periodsPerWeek?: number;
      allowDoublePeriod?: boolean;
      maxPerDay?: number | null;
      avoidConsecutive?: boolean;
    };
    const updated = await prisma.subjectRequirement.update({
      where: { id },
      data: {
        ...(data.periodsPerWeek != null && { periodsPerWeek: data.periodsPerWeek }),
        ...(data.allowDoublePeriod != null && { allowDoublePeriod: data.allowDoublePeriod }),
        ...(data.maxPerDay !== undefined && { maxPerDay: data.maxPerDay }),
        ...(data.avoidConsecutive != null && { avoidConsecutive: data.avoidConsecutive }),
      },
      include: { subject: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.subjectRequirement.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
