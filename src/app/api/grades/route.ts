import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { gradeSchema } from "@/lib/validations";

export async function GET() {
  try {
    const grades = await prisma.grade.findMany({
      orderBy: [{ number: "asc" }, { label: "asc" }],
      select: {
        id: true,
        number: true,
        label: true,
        sections: { select: { id: true, name: true, gradeId: true } },
      },
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
      data: {
        ...(data.number != null && { number: data.number }),
        label: data.label,
      },
    });
    return NextResponse.json(created);
  } catch (e) {
    if (e instanceof Error && "issues" in e) {
      return NextResponse.json({ error: "Validation failed", details: e }, { status: 400 });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "A grade with this label or number already exists." },
        { status: 409 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
