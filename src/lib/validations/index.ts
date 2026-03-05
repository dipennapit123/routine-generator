import { z } from "zod";

export const schoolSettingSchema = z.object({
  schoolName: z.string().min(1),
  academicYear: z.string().min(1),
  firstPeriodPriority: z.boolean(),
  weekDays: z.string().optional(),
});

export const scheduleConfigSchema = z.object({
  type: z.enum(["LOWER", "HIGHER"]),
  periodsPerDay: z.number().int().min(1).max(12),
  periodDuration: z.number().int().min(30).max(120),
  breaks: z.array(
    z.object({
      type: z.enum(["SHORT", "LUNCH"]),
      afterPeriod: z.number().int().min(0),
      duration: z.number().int().min(5).max(60),
    })
  ),
  assembly: z
    .object({
      periodIndex: z.number().int().min(0),
      duration: z.number().int().min(5).max(60),
    })
    .nullable()
    .optional(),
});

export const gradeSchema = z.object({
  number: z.number().int().min(1).max(12).nullable().optional(),
  label: z.string().min(1),
});

export const sectionSchema = z.object({
  name: z.string().min(1).max(10),
  gradeId: z.string().cuid(),
});

export const classRoomSchema = z.object({
  gradeId: z.string().cuid(),
  sectionId: z.string().cuid(),
  displayName: z.string().min(1).optional(),
});

export const subjectSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["THEORY", "PRACTICAL", "ECA"]),
  requiresResource: z.boolean().default(false),
  // Free-form resource type so schools can define their own infra labels.
  resourceType: z.string().min(1).nullable().optional(),
});

export const resourceSchema = z.object({
  name: z.string().min(1),
  // Free-form resource type (e.g. SCIENCE_LAB, COMPUTER_LAB, SPORTS_GROUND, MUSIC_ROOM, ...).
  type: z.string().min(1),
  capacity: z.number().int().min(1).default(1),
});

export const teacherSubjectSchema = z.object({
  teacherId: z.string().cuid(),
  subjectId: z.string().cuid(),
});

export const teacherSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["FULL_TIME", "PART_TIME"]),
  maxPerWeek: z.number().int().min(1).max(50),
  maxPerDay: z.number().int().min(1).max(10),
});

export const teacherAvailabilitySchema = z.object({
  teacherId: z.string().cuid(),
  day: z.number().int().min(0).max(6),
  periodIndex: z.number().int().min(0),
  status: z.enum(["AVAILABLE", "BLOCKED", "LEAVE"]),
});

export const classTeacherSchema = z.object({
  classId: z.string().cuid(),
  teacherId: z.string().cuid(),
});

export const teacherAssignmentSchema = z.object({
  classId: z.string().cuid(),
  subjectId: z.string().cuid(),
  teacherId: z.string().cuid(),
});

export const gradeModeSchema = z.object({
  gradeId: z.string().cuid(),
  mode: z.enum(["GRADE_SYSTEM", "SUBJECT_SYSTEM"]),
});

export const subjectRequirementSchema = z.object({
  gradeId: z.string().cuid().nullable().optional(),
  classId: z.string().cuid().nullable().optional(),
  subjectId: z.string().cuid(),
  periodsPerWeek: z.number().int().min(0).max(20),
  allowDoublePeriod: z.boolean().default(false),
  maxPerDay: z.number().int().min(1).max(6).nullable().optional(),
  avoidConsecutive: z.boolean().default(false),
});

export const routineGenerateSchema = z.object({
  seed: z.number().int().optional(),
  firstPeriodPriorityOverride: z.boolean().optional(),
  configType: z
    .enum(["PRE_PRIMARY", "LOWER", "HIGHER", "PLUS_TWO", "BACHELOR", "MASTER"])
    .optional(),
});

export const routineSlotUpdateSchema = z.object({
  slotType: z.enum(["CLASS", "BREAK", "LUNCH", "ASSEMBLY", "FREE"]),
  subjectId: z.string().cuid().nullable().optional(),
  teacherId: z.string().cuid().nullable().optional(),
  resourceId: z.string().cuid().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type SchoolSettingInput = z.infer<typeof schoolSettingSchema>;
export type ScheduleConfigInput = z.infer<typeof scheduleConfigSchema>;
export type GradeInput = z.infer<typeof gradeSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
export type ClassRoomInput = z.infer<typeof classRoomSchema>;
export type SubjectInput = z.infer<typeof subjectSchema>;
export type ResourceInput = z.infer<typeof resourceSchema>;
export type TeacherInput = z.infer<typeof teacherSchema>;
export type TeacherAvailabilityInput = z.infer<typeof teacherAvailabilitySchema>;
export type ClassTeacherInput = z.infer<typeof classTeacherSchema>;
export type TeacherAssignmentInput = z.infer<typeof teacherAssignmentSchema>;
export type GradeModeInput = z.infer<typeof gradeModeSchema>;
export type SubjectRequirementInput = z.infer<typeof subjectRequirementSchema>;
export type RoutineGenerateInput = z.infer<typeof routineGenerateSchema>;
export type RoutineSlotUpdateInput = z.infer<typeof routineSlotUpdateSchema>;
