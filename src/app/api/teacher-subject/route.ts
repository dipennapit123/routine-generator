import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { teacherSubjectSchema } from "@/lib/validations";

export async function GET() {
  try {
    const list = await prisma.teacherSubject.findMany({
      include: { teacher: true, subject: true },
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
    const data = teacherSubjectSchema.parse(body);
    const created = await prisma.teacherSubject.upsert({
      where: { teacherId_subjectId: { teacherId: data.teacherId, subjectId: data.subjectId } },
      create: { teacherId: data.teacherId, subjectId: data.subjectId },
      update: {},
      include: { teacher: true, subject: true },
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
  const teacherId = searchParams.get("teacherId");
  const subjectId = searchParams.get("subjectId");
  if (!teacherId || !subjectId) {
    return NextResponse.json({ error: "teacherId and subjectId required" }, { status: 400 });
  }
  try {
    await prisma.teacherSubject.delete({
      where: { teacherId_subjectId: { teacherId, subjectId } },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

