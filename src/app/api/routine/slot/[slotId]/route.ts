import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { routineSlotUpdateSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slotId: string }> }
) {
  try {
    const { slotId } = await params;
    const body = await request.json();
    const data = routineSlotUpdateSchema.parse(body);
    const updated = await prisma.routineSlot.update({
      where: { id: slotId },
      data: {
        slotType: data.slotType,
        subjectId: data.subjectId ?? undefined,
        teacherId: data.teacherId ?? undefined,
        resourceId: data.resourceId ?? undefined,
        notes: data.notes ?? undefined,
      },
      include: { classRoom: true, subject: true, teacher: true, resource: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Error && "issues" in e) {
      return NextResponse.json({ error: "Validation failed", details: e }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
