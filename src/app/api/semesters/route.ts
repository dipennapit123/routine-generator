import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { semesterSchema } from "@/lib/validations";

function isBachelorOrMaster(grade: { label: string }): boolean {
  return /bachelor|master/i.test(grade.label);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gradeId = searchParams.get("gradeId");
  try {
    const semesters = await prisma.semester.findMany({
      where: gradeId ? { gradeId } : undefined,
      select: {
        id: true,
        gradeId: true,
        number: true,
        grade: { select: { id: true, label: true, number: true } },
      },
      orderBy: [{ gradeId: "asc" }, { number: "asc" }],
    });
    return NextResponse.json(semesters);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = semesterSchema.parse(body);
    const grade = await prisma.grade.findUniqueOrThrow({
      where: { id: data.gradeId },
      select: { id: true, label: true },
    });
    if (!isBachelorOrMaster(grade)) {
      return NextResponse.json(
        { error: "Semesters are only for Bachelor and Master grades." },
        { status: 400 }
      );
    }
    const maxSem =
      /bachelor/i.test(grade.label) ? 8 : 4;
    if (data.number < 1 || data.number > maxSem) {
      return NextResponse.json(
        { error: `Bachelor has 8 semesters (1–8), Master has 4 (1–4). Invalid: ${data.number}` },
        { status: 400 }
      );
    }
    const created = await prisma.semester.create({
      data: { gradeId: data.gradeId, number: data.number },
      select: {
        id: true,
        gradeId: true,
        number: true,
        grade: { select: { id: true, label: true } },
      },
    });
    return NextResponse.json(created);
  } catch (e) {
    if (e instanceof Error && "issues" in e) {
      return NextResponse.json({ error: "Validation failed", details: e }, { status: 400 });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "This semester number already exists for this grade." },
        { status: 409 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
