import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gradeSchema } from "@/lib/validations";

export async function GET() {
  try {
    const grades = await prisma.grade.findMany({
      orderBy: { number: "asc" },
      include: { sections: true },
    });
    return NextResponse.json(grades);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = gradeSchema.parse(body);
    const created = await prisma.grade.create({
      data: { number: data.number },
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
