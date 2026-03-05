import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { classRoomSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gradeId = searchParams.get("gradeId");
  try {
    const classes = await prisma.classRoom.findMany({
      where: gradeId ? { gradeId } : undefined,
      select: {
        id: true,
        displayName: true,
        gradeId: true,
        sectionId: true,
        grade: { select: { id: true, number: true, label: true } },
        section: {
          select: {
            id: true,
            name: true,
            semesterId: true,
            semester: { select: { id: true, number: true } },
            facultyId: true,
            faculty: { select: { id: true, name: true } },
            groupId: true,
            group: { select: { id: true, name: true } },
          },
        },
        classTeacher: { select: { teacher: { select: { id: true, name: true } } } },
      },
      orderBy: [{ grade: { label: "asc" } }, { section: { name: "asc" } }, { displayName: "asc" }],
    });
    return NextResponse.json(classes);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = classRoomSchema.parse(body);
    const grade = await prisma.grade.findUniqueOrThrow({ where: { id: data.gradeId } });
    const section = await prisma.section.findUniqueOrThrow({
      where: { id: data.sectionId },
      include: { grade: true, faculty: true, group: true, semester: true },
    });
    if (section.gradeId !== data.gradeId) {
      return NextResponse.json({ error: "Section does not belong to grade" }, { status: 400 });
    }
    const gradePart = grade.number != null ? `Grade ${grade.number}` : grade.label;
    const semPart =
      section.semester != null ? ` Sem ${section.semester.number}` : "";
    const facultyPart =
      section.faculty && section.faculty.name !== "General"
        ? ` ${section.faculty.name}`
        : "";
    const groupPart = section.group ? ` ${section.group.name}` : "";
    const displayName =
      data.displayName ??
      (`${gradePart}${semPart}${facultyPart}${groupPart}-${section.name}`.replace(/^\s+|\s+$/g, "").replace(/\s+/g, " ") ||
        `${gradePart}-${section.name}`);
    const created = await prisma.classRoom.create({
      data: { gradeId: data.gradeId, sectionId: data.sectionId, displayName },
      select: {
        id: true,
        displayName: true,
        gradeId: true,
        sectionId: true,
        grade: { select: { id: true, number: true, label: true } },
        section: {
          select: {
            id: true,
            name: true,
            semester: { select: { id: true, number: true } },
            faculty: { select: { id: true, name: true } },
            group: { select: { id: true, name: true } },
          },
        },
      },
    });
    return NextResponse.json(created);
  } catch (e) {
    if (e instanceof Error && "issues" in e) {
      return NextResponse.json({ error: "Validation failed", details: e }, { status: 400 });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "A class for this grade and section already exists." },
        { status: 409 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
