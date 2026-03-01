import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scheduleConfigSchema } from "@/lib/validations";

export async function GET() {
  try {
    const configs = await prisma.scheduleConfig.findMany({ orderBy: { type: "asc" } });
    return NextResponse.json(configs);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = scheduleConfigSchema.parse(body);
    const created = await prisma.scheduleConfig.upsert({
      where: { type: data.type },
      create: {
        type: data.type,
        periodsPerDay: data.periodsPerDay,
        periodDuration: data.periodDuration,
        breaks: data.breaks as object,
        assembly: data.assembly as object ?? undefined,
      },
      update: {
        periodsPerDay: data.periodsPerDay,
        periodDuration: data.periodDuration,
        breaks: data.breaks as object,
        assembly: data.assembly as object ?? undefined,
      },
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
