import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subjectSchema } from "@/lib/validations";

export async function GET() {
  try {
    const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(subjects);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = subjectSchema.parse(body);
    if (data.requiresResource && !data.resourceType) {
      return NextResponse.json(
        { error: "resourceType required when requiresResource is true" },
        { status: 400 }
      );
    }
    const created = await prisma.subject.create({
      data: {
        name: data.name,
        type: data.type,
        requiresResource: data.requiresResource,
        resourceType: data.requiresResource ? data.resourceType : null,
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
