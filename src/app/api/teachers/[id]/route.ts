import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { teacherSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = teacherSchema.partial().parse(body);
    const updated = await prisma.teacher.update({
      where: { id },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.type != null && { type: data.type }),
        ...(data.maxPerWeek != null && { maxPerWeek: data.maxPerWeek }),
        ...(data.maxPerDay != null && { maxPerDay: data.maxPerDay }),
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Error && "issues" in e) {
      return NextResponse.json({ error: "Validation failed", details: e }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.teacher.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
