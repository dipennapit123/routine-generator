import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { groupSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const facultyId = searchParams.get("facultyId");
  try {
    const groups = await prisma.group.findMany({
      where: facultyId ? { facultyId } : undefined,
      select: {
        id: true,
        name: true,
        facultyId: true,
        faculty: { select: { id: true, name: true, gradeId: true, grade: { select: { id: true, label: true } } } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(groups);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = groupSchema.parse(body);
    const created = await prisma.group.create({
      data: { name: data.name.trim(), facultyId: data.facultyId },
      select: {
        id: true,
        name: true,
        facultyId: true,
        faculty: { select: { id: true, name: true, grade: { select: { label: true } } } },
      },
    });
    return NextResponse.json(created);
  } catch (e) {
    if (e instanceof Error && "issues" in e) {
      return NextResponse.json({ error: "Validation failed", details: e }, { status: 400 });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "A group with this name already exists for this faculty." },
        { status: 409 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
