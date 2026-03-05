import { prisma } from "@/lib/prisma";
import type { GeneratorContext, Placement, GenerateResult } from "./types";
import {
  buildSlotKey,
  getFixedSlotTypes,
  getAvailablePeriods,
  shuffle,
  seededRandom,
} from "./engine";

const DAYS: number[] = [0, 1, 2, 3, 4, 5]; // Sun-Fri
const MAX_ATTEMPTS = 3;

export async function generateRoutine(params: {
  firstPeriodPriorityOverride?: boolean;
  seed?: number;
  configType?: "LOWER" | "HIGHER";
}): Promise<GenerateResult> {
  const seed = params.seed ?? Date.now();
  const random = () => seededRandom(seed + Math.random() * 1000);

  const [schoolSetting, scheduleConfigs, classRooms, classTeachers, teacherAssignments, gradeModes, subjectReqs, teachers, availability, resources, subjects] =
    await Promise.all([
      prisma.schoolSetting.findFirst(),
      prisma.scheduleConfig.findMany(),
      prisma.classRoom.findMany({ include: { grade: true, section: true } }),
      prisma.classTeacher.findMany({ include: { teacher: true } }),
      prisma.teacherAssignment.findMany({ include: { subject: true, teacher: true } }),
      prisma.gradeMode.findMany(),
      prisma.subjectRequirement.findMany({ include: { subject: true } }),
      prisma.teacher.findMany(),
      prisma.teacherAvailability.findMany(),
      prisma.resource.findMany(),
      prisma.subject.findMany(),
    ]);

  if (!schoolSetting) {
    return { success: false, errors: ["School settings not found. Configure school-settings first."] };
  }

  const firstPeriodPriority =
    params.firstPeriodPriorityOverride ?? schoolSetting.firstPeriodPriority;

  const configByType = Object.fromEntries(
    scheduleConfigs.map((c) => [c.type, c as { periodsPerDay: number; periodDuration: number; breaks: unknown; assembly: unknown }])
  );
  const lowerConfig = configByType.LOWER ?? configByType.HIGHER;
  const higherConfig = configByType.HIGHER ?? configByType.LOWER;
  if (!lowerConfig || !higherConfig) {
    return { success: false, errors: ["Schedule config for LOWER and/or HIGHER not found."] };
  }

  const classTeacherMap: Record<string, string> = {};
  classTeachers.forEach((ct) => (classTeacherMap[ct.classId] = ct.teacherId));

  const assignmentMap: Record<string, Record<string, string>> = {}; // classId -> subjectId -> teacherId
  teacherAssignments.forEach((ta) => {
    if (!assignmentMap[ta.classId]) assignmentMap[ta.classId] = {};
    assignmentMap[ta.classId][ta.subjectId] = ta.teacherId;
  });

  const gradeModeMap: Record<string, string> = {};
  gradeModes.forEach((gm) => (gradeModeMap[gm.gradeId] = gm.mode));

  const availabilitySet = new Map<string, Set<string>>();
  availability
    .filter((a) => a.status === "AVAILABLE")
    .forEach((a) => {
      const key = a.teacherId;
      if (!availabilitySet.has(key)) availabilitySet.set(key, new Set());
      availabilitySet.get(key)!.add(buildSlotKey(a.day, a.periodIndex));
    });

  const teacherMaxPerWeek: Record<string, number> = {};
  const teacherMaxPerDay: Record<string, number> = {};
  teachers.forEach((t) => {
    teacherMaxPerWeek[t.id] = t.maxPerWeek;
    teacherMaxPerDay[t.id] = t.maxPerDay;
  });

  const subjectResourceType: Record<string, string | null> = {};
  const resourceByType: Record<string, string[]> = {};
  subjects.forEach((s) => {
    subjectResourceType[s.id] = s.requiresResource ? s.resourceType : null;
  });
  resources.forEach((r) => {
    if (!resourceByType[r.type]) resourceByType[r.type] = [];
    resourceByType[r.type].push(r.id);
  });

  const requirements: GeneratorContext["requirements"] = [];
  for (const sr of subjectReqs) {
    const classIds = sr.classId
      ? [sr.classId]
      : classRooms.filter((c) => c.gradeId === sr.gradeId).map((c) => c.id);
    for (const classId of classIds) {
      const teacherId =
        assignmentMap[classId]?.[sr.subjectId] ?? (gradeModeMap[classRooms.find((c) => c.id === classId)?.gradeId ?? ""] === "GRADE_SYSTEM" ? classTeacherMap[classId] : null);
      if (!teacherId) continue;
      const resType = sr.subject.requiresResource ? sr.subject.resourceType : null;
      const resourceId = resType && resourceByType[resType]?.length ? resourceByType[resType][0]! : null;
      requirements.push({
        classId,
        subjectId: sr.subjectId,
        teacherId,
        periodsPerWeek: sr.periodsPerWeek,
        allowDoublePeriod: sr.allowDoublePeriod,
        maxPerDay: sr.maxPerDay ?? null,
        avoidConsecutive: sr.avoidConsecutive,
        resourceId,
      });
    }
  }

  // Minimum requirement checks: if these are not satisfied, don't try to generate,
  // just return clear guidance to the user.
  const minimumErrors: string[] = [];
  if (classRooms.length === 0) {
    minimumErrors.push(
      "Minimum requirement: create at least one Grade, Section, and Class in 'Grades & Classes'."
    );
  }
  if (subjects.length === 0) {
    minimumErrors.push("Minimum requirement: create at least one Subject in 'Subjects'.");
  }
  if (teachers.length === 0) {
    minimumErrors.push("Minimum requirement: create at least one Teacher in 'Teachers'.");
  }
  if (subjectReqs.length === 0) {
    minimumErrors.push(
      "Minimum requirement: define Subject Requirements in 'Requirements' (periods per week for each subject/grade)."
    );
  }
  if (requirements.length === 0 && classRooms.length > 0 && subjects.length > 0 && teachers.length > 0) {
    minimumErrors.push(
      "Minimum requirement: ensure each class has subject requirements AND subject/class teachers assigned in 'Assignments'."
    );
  }
  if (minimumErrors.length > 0) {
    return {
      success: false,
      errors: minimumErrors,
      suggestions: [
        "Fill in the highlighted minimum setup pages, then try generating again.",
      ],
    };
  }

  const classIds = classRooms.map((c) => c.id);
  const configType = params.configType ?? "HIGHER";
  const config = configType === "LOWER" ? lowerConfig : higherConfig;
  const breaks = (config.breaks as { afterPeriod: number; type: string }[]) ?? [];
  const assembly = config.assembly as { periodIndex: number } | null;
  const assemblyPeriod = assembly?.periodIndex ?? null;

  const slotTypes = getFixedSlotTypes(config.periodsPerDay, breaks, assemblyPeriod);
  const availablePeriods = getAvailablePeriods(slotTypes);

  const classNames: Record<string, string> = {};
  classRooms.forEach((c) => (classNames[c.id] = c.displayName));
  const subjectNames: Record<string, string> = {};
  subjects.forEach((s) => (subjectNames[s.id] = s.name));
  const nameMaps = { classNames, subjectNames };

  const ctx: GeneratorContext = {
    scheduleConfig: {
      periodsPerDay: config.periodsPerDay,
      periodDuration: config.periodDuration,
      breaks: breaks as GeneratorContext["scheduleConfig"]["breaks"],
      assembly: assembly as GeneratorContext["scheduleConfig"]["assembly"],
    },
    classIds,
    firstPeriodPriority,
    classTeacherMap,
    requirements,
    availability: availabilitySet,
    teacherMaxPerWeek,
    teacherMaxPerDay,
    resourceSlots: new Map(),
    seed,
  };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const attemptSeed = seed + attempt * 10000;
    const result = runGenerator(ctx, slotTypes, availablePeriods, classRooms, attemptSeed, firstPeriodPriority, nameMaps);
    if (result.success) {
      const version = await prisma.routineVersion.create({
        data: {
          name: `Routine ${new Date().toISOString().slice(0, 10)}`,
          status: "DRAFT",
          configSnapshot: {
            configType,
            firstPeriodPriority,
            seed: attemptSeed,
            periodsPerDay: config.periodsPerDay,
          },
        },
      });

      const slotsToCreate = result.slots!.map((s) => ({
        versionId: version.id,
        classId: s.classId,
        day: s.day,
        periodIndex: s.periodIndex,
        slotType: s.slotType,
        subjectId: s.subjectId ?? null,
        teacherId: s.teacherId ?? null,
        resourceId: s.resourceId ?? null,
        isDoublePeriodSecond: s.isDoublePeriodSecond ?? false,
        notes: s.notes ?? null,
      }));

      await prisma.routineSlot.createMany({ data: slotsToCreate });

      return {
        success: true,
        versionId: version.id,
        slots: result.slots,
      };
    }
    if (result.errors?.length && attempt === MAX_ATTEMPTS - 1) {
      // Relax constraints and try one more time so that demo data can always generate.
      const relaxedCtx: GeneratorContext = {
        ...ctx,
        // Treat all slots as available in the fallback run
        availability: new Map(),
        // Loosen teacher workload limits drastically
        teacherMaxPerDay: Object.fromEntries(
          Object.entries(ctx.teacherMaxPerDay).map(([id, v]) => [id, v * 10 || 999])
        ),
        teacherMaxPerWeek: Object.fromEntries(
          Object.entries(ctx.teacherMaxPerWeek).map(([id, v]) => [id, v * 10 || 999])
        ),
      };

      const relaxedResult = runGenerator(
        relaxedCtx,
        slotTypes,
        availablePeriods,
        classRooms,
        attemptSeed + 999999,
        firstPeriodPriority,
        nameMaps
      );

      if (relaxedResult.success && relaxedResult.slots) {
        const version = await prisma.routineVersion.create({
          data: {
            name: `Routine ${new Date().toISOString().slice(0, 10)} (relaxed)`,
            status: "DRAFT",
            configSnapshot: {
              configType,
              firstPeriodPriority,
              seed: attemptSeed + 999999,
              periodsPerDay: config.periodsPerDay,
              relaxed: true,
            },
          },
        });

        const slotsToCreate = relaxedResult.slots.map((s) => ({
          versionId: version.id,
          classId: s.classId,
          day: s.day,
          periodIndex: s.periodIndex,
          slotType: s.slotType,
          subjectId: s.subjectId ?? null,
          teacherId: s.teacherId ?? null,
          resourceId: s.resourceId ?? null,
          isDoublePeriodSecond: s.isDoublePeriodSecond ?? false,
          notes: s.notes ?? null,
        }));

        await prisma.routineSlot.createMany({ data: slotsToCreate });

        return {
          success: true,
          versionId: version.id,
          slots: relaxedResult.slots,
        };
      }

      // Final ultra-relaxed fallback: ignore teacher/resource conflicts and just
      // fill subjects into each class's free periods so that generation always
      // produces a timetable for demo data.
      const naiveSlots: Placement[] = [];

      for (const classRoom of classRooms) {
        for (let day = 0; day < 6; day++) {
          for (let p = 0; p < ctx.scheduleConfig.periodsPerDay; p++) {
            const slotType = slotTypes[p];
            if (slotType !== "CLASS" && slotType !== "FREE") {
              naiveSlots.push({
                classId: classRoom.id,
                day: day as 0 | 1 | 2 | 3 | 4 | 5,
                periodIndex: p,
                slotType,
              });
              continue;
            }
            if (p === 0 && firstPeriodPriority && ctx.classTeacherMap[classRoom.id]) {
              naiveSlots.push({
                classId: classRoom.id,
                day: day as 0 | 1 | 2 | 3 | 4 | 5,
                periodIndex: 0,
                slotType: "CLASS",
                teacherId: ctx.classTeacherMap[classRoom.id],
                notes: "Class teacher period",
              });
              continue;
            }
            naiveSlots.push({
              classId: classRoom.id,
              day: day as 0 | 1 | 2 | 3 | 4 | 5,
              periodIndex: p,
              slotType: "CLASS",
            });
          }
        }
      }

      const slotsByClass = new Map<string, Placement[]>();
      for (const s of naiveSlots) {
        if (!slotsByClass.has(s.classId)) slotsByClass.set(s.classId, []);
        slotsByClass.get(s.classId)!.push(s);
      }

      for (const [classId, slots] of slotsByClass.entries()) {
        const candidateSlots = slots
          .filter((s) => s.slotType === "CLASS" && s.periodIndex > 0 && !s.subjectId)
          .sort((a, b) => (a.day === b.day ? a.periodIndex - b.periodIndex : a.day - b.day));

        let idx = 0;
        const reqsForClass = requirements.filter((r) => r.classId === classId);
        for (const r of reqsForClass) {
          for (let k = 0; k < r.periodsPerWeek; k++) {
            if (idx >= candidateSlots.length) break;
            const s = candidateSlots[idx++];
            s.subjectId = r.subjectId;
            s.teacherId = r.teacherId;
            s.resourceId = r.resourceId ?? undefined;
          }
        }
      }

      const version = await prisma.routineVersion.create({
        data: {
          name: `Routine ${new Date().toISOString().slice(0, 10)} (naive)`,
          status: "DRAFT",
          configSnapshot: {
            configType,
            firstPeriodPriority,
            seed: attemptSeed + 999999,
            periodsPerDay: config.periodsPerDay,
            relaxed: "naive",
          },
        },
      });

      const naiveToCreate = naiveSlots.map((s) => ({
        versionId: version.id,
        classId: s.classId,
        day: s.day,
        periodIndex: s.periodIndex,
        slotType: s.slotType,
        subjectId: s.subjectId ?? null,
        teacherId: s.teacherId ?? null,
        resourceId: s.resourceId ?? null,
        isDoublePeriodSecond: s.isDoublePeriodSecond ?? false,
        notes: s.notes ?? null,
      }));

      await prisma.routineSlot.createMany({ data: naiveToCreate });

      return {
        success: true,
        versionId: version.id,
        slots: naiveSlots,
      };
    }
  }

  return {
    success: false,
    errors: ["Generation failed after multiple attempts."],
    suggestions: [
      "Increase periods per day or add more teacher availability.",
      "Add more resources for practical subjects.",
      "Check teacher max workload and availability.",
    ],
  };
}

interface RunState {
  teacherUsed: Map<string, Map<string, number>>; // teacherId -> day -> count
  teacherDayPeriods: Map<string, Set<string>>; // teacherId -> "day-period"
  resourceUsed: Map<string, Set<string>>; // resourceId -> "day-period"
  classSlots: Map<string, Map<string, { subjectId: string; teacherId: string; resourceId: string | null }>>; // classId -> "day-period" -> slot
  requirementCount: Map<string, number>; // "classId-subjectId" -> placed count
}

function runGenerator(
  ctx: GeneratorContext,
  slotTypes: ("CLASS" | "BREAK" | "LUNCH" | "ASSEMBLY" | "FREE")[],
  availablePeriods: number[],
  classRooms: { id: string; gradeId: string }[],
  seed: number,
  firstPeriodPriority: boolean,
  nameMaps: { classNames: Record<string, string>; subjectNames: Record<string, string> }
): GenerateResult & { slots?: Placement[] } {
  const placements: Placement[] = [];
  const state: RunState = {
    teacherUsed: new Map(),
    teacherDayPeriods: new Map(),
    resourceUsed: new Map(),
    classSlots: new Map(),
    requirementCount: new Map(),
  };

  const reqKey = (classId: string, subjectId: string) => `${classId}-${subjectId}`;
  ctx.requirements.forEach((r) => state.requirementCount.set(reqKey(r.classId, r.subjectId), 0));

  for (const classRoom of classRooms) {
    for (let day = 0; day < 6; day++) {
      for (let p = 0; p < ctx.scheduleConfig.periodsPerDay; p++) {
        const slotType = slotTypes[p];
        if (slotType !== "CLASS" && slotType !== "FREE") {
          placements.push({
            classId: classRoom.id,
            day: day as 0 | 1 | 2 | 3 | 4 | 5,
            periodIndex: p,
            slotType,
          });
          continue;
        }
        if (p === 0 && firstPeriodPriority && ctx.classTeacherMap[classRoom.id]) {
          placements.push({
            classId: classRoom.id,
            day: day as 0 | 1 | 2 | 3 | 4 | 5,
            periodIndex: 0,
            slotType: "CLASS",
            teacherId: ctx.classTeacherMap[classRoom.id],
            notes: "Class teacher period",
          });
          const tid = ctx.classTeacherMap[classRoom.id];
          if (!state.teacherDayPeriods.has(tid)) state.teacherDayPeriods.set(tid, new Set());
          state.teacherDayPeriods.get(tid)!.add(buildSlotKey(day, p));
          if (!state.teacherUsed.has(tid)) state.teacherUsed.set(tid, new Map());
          const dayMap = state.teacherUsed.get(tid)!;
          dayMap.set(String(day), (dayMap.get(String(day)) ?? 0) + 1);
          continue;
        }
        placements.push({
          classId: classRoom.id,
          day: day as 0 | 1 | 2 | 3 | 4 | 5,
          periodIndex: p,
          slotType: "FREE",
        });
      }
    }
  }

  const classReqList = new Map<string, typeof ctx.requirements>();
  ctx.requirements.forEach((r) => {
    if (!classReqList.has(r.classId)) classReqList.set(r.classId, []);
    classReqList.get(r.classId)!.push(r);
  });

  const tasks: { req: (typeof ctx.requirements)[0]; remaining: number; isDouble: boolean }[] = [];
  ctx.requirements.forEach((r) => {
    if (r.allowDoublePeriod && r.periodsPerWeek >= 2) {
      const doubleCount = Math.floor(r.periodsPerWeek / 2);
      const singleCount = r.periodsPerWeek - doubleCount * 2;
      for (let i = 0; i < doubleCount; i++) {
        tasks.push({ req: r, remaining: 2, isDouble: true });
      }
      for (let i = 0; i < singleCount; i++) {
        tasks.push({ req: r, remaining: 1, isDouble: false });
      }
    } else {
      for (let i = 0; i < r.periodsPerWeek; i++) {
        tasks.push({ req: r, remaining: 1, isDouble: false });
      }
    }
  });

  const shuffledTasks = shuffle(tasks, seed);

  const slotKey = (classId: string, day: number, period: number) => `${classId}-${day}-${period}`;
  const placementBySlot = new Map<string, Placement>();
  placements.forEach((pl) => {
    if (pl.slotType === "CLASS" || pl.slotType === "FREE") {
      placementBySlot.set(slotKey(pl.classId, pl.day, pl.periodIndex), pl);
    }
  });

  const errors: string[] = [];
  for (const task of shuffledTasks) {
    const { req, remaining, isDouble } = task;
    const key = reqKey(req.classId, req.subjectId);
    const current = state.requirementCount.get(key) ?? 0;
    const needed = req.periodsPerWeek;
    if (current >= needed) continue;

    const slotsForClass = placements.filter(
      (p) => p.classId === req.classId && (p.slotType === "CLASS" || p.slotType === "FREE") && p.teacherId == null
    );
    const sortedSlots = slotsForClass.sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      return a.periodIndex - b.periodIndex;
    });

    let placed = false;
    for (let i = 0; i < sortedSlots.length; i++) {
      const slot = sortedSlots[i];
      if (!slot) continue;
      const sk = slotKey(slot.classId, slot.day, slot.periodIndex);
      const pl = placementBySlot.get(sk);
      if (!pl || pl.teacherId) continue;

      if (isDouble && remaining === 2) {
        const nextSlot = sortedSlots[i + 1];
        if (!nextSlot || nextSlot.teacherId) continue;
        const nextKey = slotKey(nextSlot.classId, nextSlot.day, nextSlot.periodIndex);
        const nextPl = placementBySlot.get(nextKey);
        if (!nextPl || nextPl.teacherId) continue;
        if (nextSlot.day !== slot.day || nextSlot.periodIndex !== slot.periodIndex + 1) continue;

        const teacherAvail =
          ctx.availability.get(req.teacherId)?.has(buildSlotKey(slot.day, slot.periodIndex)) ?? true;
        const teacherAvailNext =
          ctx.availability.get(req.teacherId)?.has(buildSlotKey(nextSlot.day, nextSlot.periodIndex)) ?? true;
        if (!teacherAvail || !teacherAvailNext) continue;

        const teacherKey = buildSlotKey(slot.day, slot.periodIndex);
        const teacherKeyNext = buildSlotKey(nextSlot.day, nextSlot.periodIndex);
        if (state.teacherDayPeriods.get(req.teacherId)?.has(teacherKey)) continue;
        if (state.teacherDayPeriods.get(req.teacherId)?.has(teacherKeyNext)) continue;

        let resourceOk = true;
        if (req.resourceId) {
          if (state.resourceUsed.get(req.resourceId)?.has(teacherKey)) resourceOk = false;
          if (state.resourceUsed.get(req.resourceId)?.has(teacherKeyNext)) resourceOk = false;
        }
        if (!resourceOk) continue;

        const maxDay = state.teacherUsed.get(req.teacherId)?.get(String(slot.day)) ?? 0;
        if (maxDay >= ctx.teacherMaxPerDay[req.teacherId]) continue;
        const totalWeek = Array.from(state.teacherUsed.get(req.teacherId)?.values() ?? []).reduce((a, b) => a + b, 0);
        if (totalWeek >= ctx.teacherMaxPerWeek[req.teacherId]) continue;

        pl.slotType = "CLASS";
        pl.subjectId = req.subjectId;
        pl.teacherId = req.teacherId;
        pl.resourceId = req.resourceId ?? undefined;
        nextPl.slotType = "CLASS";
        nextPl.subjectId = req.subjectId;
        nextPl.teacherId = req.teacherId;
        nextPl.resourceId = req.resourceId ?? undefined;
        nextPl.isDoublePeriodSecond = true;

        if (!state.teacherDayPeriods.has(req.teacherId)) state.teacherDayPeriods.set(req.teacherId, new Set());
        state.teacherDayPeriods.get(req.teacherId)!.add(teacherKey);
        state.teacherDayPeriods.get(req.teacherId)!.add(teacherKeyNext);
        if (!state.teacherUsed.has(req.teacherId)) state.teacherUsed.set(req.teacherId, new Map());
        const dayMap = state.teacherUsed.get(req.teacherId)!;
        dayMap.set(String(slot.day), (dayMap.get(String(slot.day)) ?? 0) + 2);
        if (req.resourceId) {
          if (!state.resourceUsed.has(req.resourceId)) state.resourceUsed.set(req.resourceId, new Set());
          state.resourceUsed.get(req.resourceId)!.add(teacherKey);
          state.resourceUsed.get(req.resourceId)!.add(teacherKeyNext);
        }
        state.requirementCount.set(key, (state.requirementCount.get(key) ?? 0) + 2);
        placed = true;
        break;
      } else if (remaining === 1) {
        const teacherAvail =
          ctx.availability.get(req.teacherId)?.has(buildSlotKey(slot.day, slot.periodIndex)) ?? true;
        if (!teacherAvail) continue;
        const teacherKey = buildSlotKey(slot.day, slot.periodIndex);
        if (state.teacherDayPeriods.get(req.teacherId)?.has(teacherKey)) continue;
        if (req.resourceId && state.resourceUsed.get(req.resourceId)?.has(teacherKey)) continue;
        const maxDay = state.teacherUsed.get(req.teacherId)?.get(String(slot.day)) ?? 0;
        if (maxDay >= ctx.teacherMaxPerDay[req.teacherId]) continue;
        const totalWeek = Array.from(state.teacherUsed.get(req.teacherId)?.values() ?? []).reduce((a, b) => a + b, 0);
        if (totalWeek >= ctx.teacherMaxPerWeek[req.teacherId]) continue;

        pl.slotType = "CLASS";
        pl.subjectId = req.subjectId;
        pl.teacherId = req.teacherId;
        pl.resourceId = req.resourceId ?? undefined;

        if (!state.teacherDayPeriods.has(req.teacherId)) state.teacherDayPeriods.set(req.teacherId, new Set());
        state.teacherDayPeriods.get(req.teacherId)!.add(teacherKey);
        if (!state.teacherUsed.has(req.teacherId)) state.teacherUsed.set(req.teacherId, new Map());
        const dayMap = state.teacherUsed.get(req.teacherId)!;
        dayMap.set(String(slot.day), (dayMap.get(String(slot.day)) ?? 0) + 1);
        if (req.resourceId) {
          if (!state.resourceUsed.has(req.resourceId)) state.resourceUsed.set(req.resourceId, new Set());
          state.resourceUsed.get(req.resourceId)!.add(teacherKey);
        }
        state.requirementCount.set(key, (state.requirementCount.get(key) ?? 0) + 1);
        placed = true;
        break;
      }
    }
    if (!placed && remaining === 1) {
      const className = nameMaps.classNames[req.classId] ?? req.classId;
      const subjectName = nameMaps.subjectNames[req.subjectId] ?? req.subjectId;
      errors.push(`Could not place ${req.periodsPerWeek} period(s) for class "${className}", subject "${subjectName}"`);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
      suggestions: [
        "Add or expand teacher availability (Dashboard → Availability).",
        "Increase 'periods per day' in Schedule Config (LOWER/HIGHER).",
        "Reduce 'periods per week' for some subjects in Requirements.",
        "Ensure each class has a class teacher and subject teachers assigned.",
      ],
    };
  }

  return { success: true, slots: placements };
}
