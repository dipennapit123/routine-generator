export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5; // Sun-Fri

export interface BreakSpec {
  type: "SHORT" | "LUNCH";
  afterPeriod: number;
  duration: number;
}

export interface AssemblySpec {
  periodIndex: number;
  duration: number;
}

export interface ScheduleConfigData {
  periodsPerDay: number;
  periodDuration: number;
  breaks: BreakSpec[];
  assembly: AssemblySpec | null;
}

export interface SlotTask {
  classId: string;
  subjectId: string;
  teacherId: string;
  resourceId: string | null;
  isDoublePeriod: boolean;
  periodsNeeded: number;
}

export interface Placement {
  classId: string;
  day: DayIndex;
  periodIndex: number;
  slotType: "CLASS" | "BREAK" | "LUNCH" | "ASSEMBLY" | "FREE";
  subjectId?: string;
  teacherId?: string;
  resourceId?: string | null;
  isDoublePeriodSecond?: boolean;
  notes?: string;
}

export interface GeneratorContext {
  scheduleConfig: ScheduleConfigData;
  classIds: string[];
  firstPeriodPriority: boolean;
  classTeacherMap: Record<string, string>;
  requirements: Array<{
    classId: string;
    subjectId: string;
    teacherId: string;
    periodsPerWeek: number;
    allowDoublePeriod: boolean;
    maxPerDay: number | null;
    avoidConsecutive: boolean;
    resourceId: string | null;
  }>;
  availability: Map<string, Set<string>>; // teacherId -> "day-periodIndex" available
  teacherMaxPerWeek: Record<string, number>;
  teacherMaxPerDay: Record<string, number>;
  resourceSlots: Map<string, Set<string>>; // resourceId -> "day-periodIndex" used
  seed: number;
}

export interface GenerateResult {
  success: boolean;
  versionId?: string;
  slots?: Placement[];
  errors?: string[];
  suggestions?: string[];
}
