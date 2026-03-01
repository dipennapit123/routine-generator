import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const versions = await prisma.routineVersion.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { routineSlots: true } } },
    });
    return NextResponse.json(versions);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
