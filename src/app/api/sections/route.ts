import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sectionSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gradeId = searchParams.get("gradeId");
  try {
    const sections = await prisma.section.findMany({
      where: gradeId ? { gradeId } : undefined,
      include: { grade: true },
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
    const created = await prisma.section.create({
      data: { name: data.name, gradeId: data.gradeId },
      include: { grade: true },
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
