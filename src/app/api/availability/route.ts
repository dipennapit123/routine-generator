import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { teacherAvailabilitySchema } from "@/lib/validations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get("teacherId");
  if (!teacherId) {
    return NextResponse.json({ error: "teacherId required" }, { status: 400 });
  }
  try {
    const availability = await prisma.teacherAvailability.findMany({
      where: { teacherId },
      orderBy: [{ day: "asc" }, { periodIndex: "asc" }],
    });
    return NextResponse.json(availability);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = teacherAvailabilitySchema.parse(body);
    const created = await prisma.teacherAvailability.upsert({
      where: {
        teacherId_day_periodIndex: {
          teacherId: data.teacherId,
          day: data.day,
          periodIndex: data.periodIndex,
        },
      },
      create: {
        teacherId: data.teacherId,
        day: data.day,
        periodIndex: data.periodIndex,
        status: data.status,
      },
      update: { status: data.status },
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

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { teacherId, grid } = body as {
      teacherId: string;
      grid: Array<{ day: number; periodIndex: number; status: string }>;
    };
    if (!teacherId || !Array.isArray(grid)) {
      return NextResponse.json({ error: "teacherId and grid required" }, { status: 400 });
    }
    await prisma.teacherAvailability.deleteMany({ where: { teacherId } });
    const toCreate = grid
      .filter((g) => g.status && g.status !== "AVAILABLE")
      .map((g) => ({
        teacherId,
        day: g.day,
        periodIndex: g.periodIndex,
        status: g.status as "AVAILABLE" | "BLOCKED" | "LEAVE",
      }));
    if (toCreate.length > 0) {
      await prisma.teacherAvailability.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
    }
    const allSlots: { day: number; periodIndex: number; status: string }[] = [];
    for (let day = 0; day < 6; day++) {
      for (let p = 0; p < 10; p++) {
        const existing = toCreate.find((c) => c.day === day && c.periodIndex === p);
        allSlots.push({
          day,
          periodIndex: p,
          status: existing?.status ?? "AVAILABLE",
        });
      }
    }
    return NextResponse.json({ grid: allSlots });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
