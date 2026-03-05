import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { teacherSchema } from "@/lib/validations";

export async function GET() {
  try {
    const teachers = await prisma.teacher.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true, maxPerWeek: true, maxPerDay: true },
    });
    return NextResponse.json(teachers);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = teacherSchema.parse(body);
    const created = await prisma.teacher.create({
      data: {
        name: data.name,
        type: data.type,
        maxPerWeek: data.maxPerWeek,
        maxPerDay: data.maxPerDay,
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
