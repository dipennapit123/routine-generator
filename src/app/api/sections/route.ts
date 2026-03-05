import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sectionSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gradeId = searchParams.get("gradeId");
  const facultyId = searchParams.get("facultyId");
  const groupId = searchParams.get("groupId");
  const semesterId = searchParams.get("semesterId");
  try {
    const sections = await prisma.section.findMany({
      where: {
        ...(gradeId ? { gradeId } : {}),
        ...(facultyId ? { facultyId } : {}),
        ...(groupId ? { groupId } : {}),
        ...(semesterId ? { semesterId } : {}),
      },
      select: {
        id: true,
        name: true,
        gradeId: true,
        semesterId: true,
        facultyId: true,
        groupId: true,
        grade: { select: { id: true, number: true, label: true } },
        semester: { select: { id: true, number: true } },
        faculty: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(sections);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = sectionSchema.parse(body);
    let facultyId: string | null = data.facultyId ?? null;
    let groupId: string | null = data.groupId ?? null;
    if (facultyId) {
      const faculty = await prisma.faculty.findUniqueOrThrow({
        where: { id: facultyId },
        include: { grade: true },
      });
      if (faculty.gradeId !== data.gradeId) {
        return NextResponse.json({ error: "Faculty does not belong to this grade" }, { status: 400 });
      }
      if (groupId) {
        const group = await prisma.group.findUniqueOrThrow({
          where: { id: groupId },
          include: { faculty: true },
        });
        if (group.facultyId !== facultyId) {
          return NextResponse.json({ error: "Group does not belong to this faculty" }, { status: 400 });
        }
      }
    } else {
      groupId = null;
    }
    const semesterId = data.semesterId ?? null;
    if (semesterId) {
      const sem = await prisma.semester.findUniqueOrThrow({
        where: { id: semesterId },
        select: { gradeId: true },
      });
      if (sem.gradeId !== data.gradeId) {
        return NextResponse.json({ error: "Semester does not belong to this grade" }, { status: 400 });
      }
    }
    const created = await prisma.section.create({
      data: {
        name: data.name.trim(),
        gradeId: data.gradeId,
        semesterId: semesterId ?? undefined,
        facultyId: facultyId ?? undefined,
        groupId: groupId ?? undefined,
      },
      select: {
        id: true,
        name: true,
        gradeId: true,
        semesterId: true,
        facultyId: true,
        groupId: true,
        grade: { select: { id: true, number: true, label: true } },
        semester: { select: { id: true, number: true } },
        faculty: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(created);
  } catch (e) {
    if (e instanceof Error && "issues" in e) {
      return NextResponse.json({ error: "Validation failed", details: e }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
