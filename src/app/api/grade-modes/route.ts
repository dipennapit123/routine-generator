import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gradeModeSchema } from "@/lib/validations";

export async function GET() {
  try {
    const list = await prisma.gradeMode.findMany({
      select: { id: true, gradeId: true, mode: true, grade: { select: { id: true, label: true } } },
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
    const data = gradeModeSchema.parse(body);
    const created = await prisma.gradeMode.upsert({
      where: { gradeId: data.gradeId },
      create: { gradeId: data.gradeId, mode: data.mode },
      update: { mode: data.mode },
      include: { grade: true },
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
