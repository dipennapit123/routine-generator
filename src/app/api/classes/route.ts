import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { classRoomSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gradeId = searchParams.get("gradeId");
  try {
    const classes = await prisma.classRoom.findMany({
      where: gradeId ? { gradeId } : undefined,
      include: { grade: true, section: true, classTeacher: { include: { teacher: true } } },
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
      include: { grade: true },
    });
    if (section.gradeId !== data.gradeId) {
      return NextResponse.json({ error: "Section does not belong to grade" }, { status: 400 });
    }
    const displayName = data.displayName ?? `Grade ${grade.number}-${section.name}`;
    const created = await prisma.classRoom.create({
      data: { gradeId: data.gradeId, sectionId: data.sectionId, displayName },
      include: { grade: true, section: true },
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
