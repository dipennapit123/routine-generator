import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { teacherGradeSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get("teacherId");
  const gradeId = searchParams.get("gradeId");
  try {
    const list = await prisma.teacherGrade.findMany({
      where: {
        ...(teacherId ? { teacherId } : {}),
        ...(gradeId ? { gradeId } : {}),
      },
      select: {
        id: true,
        teacherId: true,
        gradeId: true,
        facultyId: true,
        groupId: true,
        sectionId: true,
        teacher: { select: { id: true, name: true } },
        grade: { select: { id: true, label: true, number: true } },
        faculty: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
      },
      orderBy: { gradeId: "asc" },
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
    const data = teacherGradeSchema.parse(body);
    const facultyId = data.facultyId ?? null;
    const groupId = data.groupId ?? null;
    const sectionId = data.sectionId ?? null;
    if (!facultyId && !groupId && !sectionId) {
      const existing = await prisma.teacherGrade.findFirst({
        where: { teacherId: data.teacherId, gradeId: data.gradeId, facultyId: null, groupId: null, sectionId: null },
      });
      if (existing) {
        return NextResponse.json(
          { error: "This teacher is already assigned to this grade." },
          { status: 409 }
        );
      }
    }
    const created = await prisma.teacherGrade.create({
      data: { teacherId: data.teacherId, gradeId: data.gradeId, facultyId, groupId, sectionId },
      select: {
        id: true,
        teacherId: true,
        gradeId: true,
        facultyId: true,
        groupId: true,
        sectionId: true,
        teacher: { select: { id: true, name: true } },
        grade: { select: { id: true, label: true } },
        faculty: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(created);
  } catch (e) {
    if (e instanceof Error && "issues" in e) {
      return NextResponse.json({ error: "Validation failed", details: e }, { status: 400 });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "This teacher is already assigned to this grade (with same faculty/group)." },
        { status: 409 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to assign" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get("teacherId");
  const gradeId = searchParams.get("gradeId");
  const id = searchParams.get("id");
  if (id) {
    try {
      await prisma.teacherGrade.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
  }
  const facultyId = searchParams.get("facultyId") ?? undefined;
  const groupId = searchParams.get("groupId") ?? undefined;
  const sectionId = searchParams.get("sectionId") ?? undefined;
  if (teacherId && gradeId) {
    try {
      await prisma.teacherGrade.deleteMany({
        where: {
          teacherId,
          gradeId,
          ...(facultyId != null && { facultyId: facultyId || null }),
          ...(groupId != null && { groupId: groupId || null }),
          ...(sectionId != null && { sectionId: sectionId || null }),
        },
      });
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "Provide id or teacherId+gradeId" }, { status: 400 });
}
