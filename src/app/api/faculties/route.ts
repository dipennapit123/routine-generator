import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { facultySchema } from "@/lib/validations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gradeId = searchParams.get("gradeId");
  try {
    const faculties = await prisma.faculty.findMany({
      where: gradeId ? { gradeId } : undefined,
      select: {
        id: true,
        name: true,
        gradeId: true,
        grade: { select: { id: true, number: true, label: true } },
      },
      orderBy: [{ grade: { label: "asc" } }, { name: "asc" }],
    });
    return NextResponse.json(faculties);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = facultySchema.parse(body);
    const created = await prisma.faculty.create({
      data: { name: data.name.trim(), gradeId: data.gradeId },
      select: {
        id: true,
        name: true,
        gradeId: true,
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
        { error: "A faculty with this name already exists for this grade." },
        { status: 409 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
