import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subjectRequirementSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gradeId = searchParams.get("gradeId");
  const classId = searchParams.get("classId");
  try {
    const list = await prisma.subjectRequirement.findMany({
      where: {
        ...(gradeId && { gradeId }),
        ...(classId && { classId }),
      },
      include: { subject: true, grade: true, classRoom: true },
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
    const data = subjectRequirementSchema.parse(body);
    if (!data.gradeId && !data.classId) {
      return NextResponse.json(
        { error: "Either gradeId or classId is required" },
        { status: 400 }
      );
    }
    const created = await prisma.subjectRequirement.create({
      data: {
        gradeId: data.gradeId ?? undefined,
        classId: data.classId ?? undefined,
        subjectId: data.subjectId,
        periodsPerWeek: data.periodsPerWeek,
        allowDoublePeriod: data.allowDoublePeriod,
        maxPerDay: data.maxPerDay ?? undefined,
        avoidConsecutive: data.avoidConsecutive,
      },
      include: { subject: true, grade: true, classRoom: true },
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
