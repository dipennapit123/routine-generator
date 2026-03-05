import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionId: string }> }
) {
  try {
    const { versionId } = await params;
    const version = await prisma.routineVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: {
        routineSlots: {
          include: {
            classRoom: { select: { displayName: true } },
            subject: { select: { name: true } },
            teacher: { select: { name: true } },
            resource: { select: { name: true } },
          },
        },
      },
    });
    return NextResponse.json(version);
  } catch (e) {
    if (e instanceof Error && e.name === "NotFoundError") {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ versionId: string }> }
) {
  try {
    const { versionId } = await params;
    const body = await request.json();
    const action = body?.action as string;
    if (action === "publish") {
      await prisma.routineVersion.updateMany({
        where: { status: "PUBLISHED" },
        data: { status: "ARCHIVED" },
      });
      await prisma.routineVersion.update({
        where: { id: versionId },
        data: { status: "PUBLISHED" },
      });
      return NextResponse.json({ ok: true, status: "PUBLISHED" });
    }
    if (action === "archive") {
      await prisma.routineVersion.update({
        where: { id: versionId },
        data: { status: "ARCHIVED" },
      });
      return NextResponse.json({ ok: true, status: "ARCHIVED" });
    }
    if (action === "duplicate") {
      const source = await prisma.routineVersion.findUniqueOrThrow({
        where: { id: versionId },
        include: { routineSlots: true },
      });
      const created = await prisma.routineVersion.create({
        data: {
          name: `${source.name} (Copy)`,
          status: "DRAFT",
          configSnapshot: source.configSnapshot as object,
        },
      });
      await prisma.routineSlot.createMany({
        data: source.routineSlots.map((s) => ({
          versionId: created.id,
          classId: s.classId,
          day: s.day,
          periodIndex: s.periodIndex,
          slotType: s.slotType,
          subjectId: s.subjectId,
          teacherId: s.teacherId,
          resourceId: s.resourceId,
          isDoublePeriodSecond: s.isDoublePeriodSecond,
          notes: s.notes,
        })),
      });
      return NextResponse.json({ ok: true, versionId: created.id });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    if (e instanceof Error && e.name === "NotFoundError") {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ versionId: string }> }
) {
  try {
    const { versionId } = await params;
    await prisma.routineVersion.delete({
      where: { id: versionId },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.name === "NotFoundError") {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
