import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const versionId = searchParams.get("versionId");
  if (!versionId) {
    return NextResponse.json({ error: "versionId required" }, { status: 400 });
  }
  try {
    const version = await prisma.routineVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: {
        routineSlots: {
          include: {
            classRoom: { include: { grade: true, section: true } },
            subject: true,
            teacher: true,
          },
        },
      },
    });

    const wb = XLSX.utils.book_new();
    const classIds = [...new Set(version.routineSlots.map((s) => s.classId).filter(Boolean))] as string[];

    for (const classId of classIds) {
      const classSlots = version.routineSlots.filter((s) => s.classId === classId);
      const className = classSlots[0]?.classRoom?.displayName ?? `Class-${classId.slice(0, 6)}`;
      const periodsPerDay = Math.max(...classSlots.map((s) => s.periodIndex), 0) + 1;
      const data: (string | undefined)[][] = [["Period", ...DAY_NAMES.slice(0, 6)]];
      for (let p = 0; p < periodsPerDay; p++) {
        const row: (string | undefined)[] = [`P${p + 1}`];
        for (let d = 0; d < 6; d++) {
          const slot = classSlots.find((s) => s.periodIndex === p && s.day === d);
          if (!slot) {
            row.push("");
            continue;
          }
          if (slot.slotType === "CLASS" && slot.subject?.name) {
            row.push(`${slot.subject.name}${slot.teacher?.name ? ` (${slot.teacher.name})` : ""}`);
          } else {
            row.push(slot.slotType);
          }
        }
        data.push(row);
      }
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, String(className).replace(/[^\w\s-]/g, "").slice(0, 31));
    }

    const teacherIds = [...new Set(version.routineSlots.map((s) => s.teacherId).filter(Boolean))] as string[];
    const teacherSlots = version.routineSlots.filter((s) => s.teacherId);
    for (const teacherId of teacherIds) {
      const name = teacherSlots.find((s) => s.teacherId === teacherId)?.teacher?.name ?? teacherId;
      const slots = teacherSlots.filter((s) => s.teacherId === teacherId);
      const periodsPerDay = Math.max(...slots.map((s) => s.periodIndex), 0) + 1;
      const data: (string | undefined)[][] = [["Period", ...DAY_NAMES.slice(0, 6)]];
      for (let p = 0; p < periodsPerDay; p++) {
        const row: (string | undefined)[] = [`P${p + 1}`];
        for (let d = 0; d < 6; d++) {
          const slot = slots.find((s) => s.periodIndex === p && s.day === d);
          if (!slot) {
            row.push("");
            continue;
          }
          row.push(slot.classRoom?.displayName ?? "");
        }
        data.push(row);
      }
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, (name as string).replace(/[^\w\s-]/g, "").slice(0, 31));
    }

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="routine-${version.name}.xlsx"`,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.name === "NotFoundError") {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
