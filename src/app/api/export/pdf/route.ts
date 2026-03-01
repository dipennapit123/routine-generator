import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const versionId = searchParams.get("versionId");
  const type = searchParams.get("type") ?? "class"; // class | teacher
  const id = searchParams.get("id"); // classId or teacherId for single sheet
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

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 40;
    const cellW = (pageWidth - margin * 2) / 7;
    const cellH = 22;
    const headerH = 40;

    function addTable(
      title: string,
      rows: number,
      getCell: (day: number, period: number) => string
    ) {
      const page = doc.addPage([pageWidth, pageHeight]);
      page.drawText(title, {
        x: margin,
        y: pageHeight - margin - 20,
        size: 16,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.4),
      });

      for (let d = 0; d < 7; d++) {
        const x = margin + d * cellW;
        page.drawRectangle({
          x,
          y: pageHeight - margin - headerH,
          width: cellW,
          height: cellH,
          borderColor: rgb(0.3, 0.3, 0.5),
        });
        page.drawText(d === 0 ? "Period" : DAY_NAMES[d - 1], {
          x: x + 4,
          y: pageHeight - margin - headerH + 6,
          size: 9,
          font: fontBold,
        });
      }
      for (let p = 0; p < rows; p++) {
        const y = pageHeight - margin - headerH - (p + 1) * cellH;
        for (let d = 0; d < 7; d++) {
          const x = margin + d * cellW;
          page.drawRectangle({
            x,
            y,
            width: cellW,
            height: cellH,
            borderColor: rgb(0.5, 0.5, 0.6),
          });
          const text = d === 0 ? `P${p + 1}` : getCell(d - 1, p);
          const truncated = text.length > 18 ? text.slice(0, 15) + "..." : text;
          page.drawText(truncated, {
            x: x + 4,
            y: y + 6,
            size: 8,
            font,
          });
        }
      }
    }

    if (type === "class" && id) {
      const classSlots = version.routineSlots.filter((s) => s.classId === id);
      const className = classSlots[0]?.classRoom?.displayName ?? "Class";
      const periods = Math.max(...classSlots.map((s) => s.periodIndex), 0) + 1;
      addTable(`${version.name} - ${className}`, periods, (day, period) => {
        const slot = classSlots.find((s) => s.day === day && s.periodIndex === period);
        if (!slot) return "";
        if (slot.slotType === "CLASS" && slot.subject?.name)
          return `${slot.subject.name}${slot.teacher?.name ? ` (${slot.teacher.name})` : ""}`;
        return slot.slotType;
      });
    } else if (type === "teacher" && id) {
      const teacherSlots = version.routineSlots.filter((s) => s.teacherId === id);
      const teacherName = teacherSlots[0]?.teacher?.name ?? "Teacher";
      const periods = Math.max(...teacherSlots.map((s) => s.periodIndex), 0) + 1;
      addTable(`${version.name} - ${teacherName}`, periods, (day, period) => {
        const slot = teacherSlots.find((s) => s.day === day && s.periodIndex === period);
        return slot?.classRoom?.displayName ?? "";
      });
    } else {
      const classes = [...new Set(version.routineSlots.map((s) => ({ id: s.classId, name: s.classRoom?.displayName })).filter((x) => x.id))];
      const seen = new Set<string>();
      const classList = classes.filter((c) => c.id && !seen.has(c.id!) && (seen.add(c.id!), true));
      for (const c of classList) {
        if (!c.id) continue;
        const classSlots = version.routineSlots.filter((s) => s.classId === c.id);
        const periods = Math.max(...classSlots.map((s) => s.periodIndex), 0) + 1;
        addTable(`${version.name} - ${c.name ?? "Class"}`, periods, (day, period) => {
          const slot = classSlots.find((s) => s.day === day && s.periodIndex === period);
          if (!slot) return "";
          if (slot.slotType === "CLASS" && slot.subject?.name)
            return `${slot.subject.name}${slot.teacher?.name ? ` (${slot.teacher.name})` : ""}`;
          return slot.slotType;
        });
      }
    }

    const pdfBytes = await doc.save();
    const buffer = Buffer.from(pdfBytes);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="routine-${version.name}.pdf"`,
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
