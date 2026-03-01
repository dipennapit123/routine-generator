import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subjectSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = subjectSchema.partial().parse(body);
    if (data.requiresResource && !data.resourceType) {
      return NextResponse.json(
        { error: "resourceType required when requiresResource is true" },
        { status: 400 }
      );
    }
    const updated = await prisma.subject.update({
      where: { id },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.type != null && { type: data.type }),
        ...(data.requiresResource != null && { requiresResource: data.requiresResource }),
        ...(data.resourceType != null && { resourceType: data.resourceType }),
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
    await prisma.subject.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
