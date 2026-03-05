import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gradeSchema } from "@/lib/validations";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.grade.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = gradeSchema.partial().parse(body);
    const updated = await prisma.grade.update({
      where: { id },
      data: {
        ...(data.number !== undefined && { number: data.number }),
        ...(data.label !== undefined && { label: data.label }),
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
