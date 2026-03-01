import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resourceSchema } from "@/lib/validations";

export async function GET() {
  try {
    const resources = await prisma.resource.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(resources);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = resourceSchema.parse(body);
    const created = await prisma.resource.create({
      data: { name: data.name, type: data.type, capacity: data.capacity ?? 1 },
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
