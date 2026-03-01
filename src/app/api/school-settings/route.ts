import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { schoolSettingSchema } from "@/lib/validations";

export async function GET() {
  try {
    const setting = await prisma.schoolSetting.findFirst();
    return NextResponse.json(setting ?? null);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = schoolSettingSchema.parse(body);
    const existing = await prisma.schoolSetting.findFirst();
    if (existing) {
      const updated = await prisma.schoolSetting.update({
        where: { id: existing.id },
        data: {
          schoolName: data.schoolName,
          academicYear: data.academicYear,
          firstPeriodPriority: data.firstPeriodPriority,
          weekDays: data.weekDays ?? existing.weekDays,
        },
      });
      return NextResponse.json(updated);
    }
    const created = await prisma.schoolSetting.create({
      data: {
        schoolName: data.schoolName,
        academicYear: data.academicYear,
        firstPeriodPriority: data.firstPeriodPriority,
        weekDays: data.weekDays ?? "Sunday,Monday,Tuesday,Wednesday,Thursday,Friday",
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
