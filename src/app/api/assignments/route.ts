import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { teacherAssignmentSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  try {
    const list = await prisma.teacherAssignment.findMany({
      where: classId ? { classId } : undefined,
      select: {
        id: true,
        classId: true,
        subjectId: true,
        teacherId: true,
        classRoom: { select: { id: true, displayName: true } },
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = teacherAssignmentSchema.parse(body);
    const created = await prisma.teacherAssignment.upsert({
      where: { classId_subjectId: { classId: data.classId, subjectId: data.subjectId } },
      create: {
        classId: data.classId,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
      },
      update: { teacherId: data.teacherId },
      include: { classRoom: true, subject: true, teacher: true },
    });
    return NextResponse.json(created);
  } catch (e) {
    if (e instanceof Error && "issues" in e) {
      return NextResponse.json({ error: "Validation failed", details: e }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  const subjectId = searchParams.get("subjectId");
  if (!classId || !subjectId) {
    return NextResponse.json({ error: "classId and subjectId required" }, { status: 400 });
  }
  try {
    await prisma.teacherAssignment.delete({
      where: { classId_subjectId: { classId, subjectId } },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
