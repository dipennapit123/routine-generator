import { NextResponse } from "next/server";
import { routineGenerateSchema } from "@/lib/validations";
import { generateRoutine } from "@/lib/generator";

// Allow longer run for timetable generation (Vercel: Pro up to 300s; Hobby 10s)
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = routineGenerateSchema.parse(body);
    const result = await generateRoutine({
      seed: data.seed,
      firstPeriodPriorityOverride: data.firstPeriodPriorityOverride,
      configType: data.configType,
    });
    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.errors, suggestions: result.suggestions },
        { status: 400 }
      );
    }
    return NextResponse.json({
      success: true,
      versionId: result.versionId,
      message: "Routine generated successfully",
    });
  } catch (e) {
    if (e instanceof Error && "issues" in e) {
      return NextResponse.json({ error: "Validation failed", details: e }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
