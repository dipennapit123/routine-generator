import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { classTeacherSchema } from "@/lib/validations";

export async function GET() {
  try {
    const list = await prisma.classTeacher.findMany({
      select: {
        id: true,
        classId: true,
        teacherId: true,
        classRoom: { select: { id: true, displayName: true } },
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
    const data = classTeacherSchema.parse(body);
    const created = await prisma.classTeacher.upsert({
      where: { classId: data.classId },
      create: { classId: data.classId, teacherId: data.teacherId },
      update: { teacherId: data.teacherId },
      include: { classRoom: true, teacher: true },
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
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    if (!classId) {
      return NextResponse.json({ error: "classId required" }, { status: 400 });
    }
    await prisma.classTeacher.deleteMany({ where: { classId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
