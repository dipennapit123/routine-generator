import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. School settings
  const existing = await prisma.schoolSetting.findFirst();
  if (!existing) {
    await prisma.schoolSetting.create({
      data: {
        schoolName: "Demo School",
        academicYear: "2024-2025",
        firstPeriodPriority: true,
        weekDays: "Sunday,Monday,Tuesday,Wednesday,Thursday,Friday",
      },
    });
  }

  // 2. Schedule config (LOWER + HIGHER)
  await prisma.scheduleConfig.upsert({
    where: { type: "LOWER" },
    create: {
      type: "LOWER",
      periodsPerDay: 6,
      periodDuration: 45,
      breaks: [
        { type: "SHORT", afterPeriod: 2, duration: 15 },
        { type: "LUNCH", afterPeriod: 4, duration: 30 },
      ],
      assembly: Prisma.DbNull,
    },
    update: {},
  });

  await prisma.scheduleConfig.upsert({
    where: { type: "HIGHER" },
    create: {
      type: "HIGHER",
      periodsPerDay: 8,
      periodDuration: 45,
      breaks: [
        { type: "SHORT", afterPeriod: 2, duration: 10 },
        { type: "LUNCH", afterPeriod: 5, duration: 30 },
      ],
      assembly: Prisma.DbNull,
    },
    update: {},
  });

  // 3. Grades 1–5
  for (const number of [1, 2, 3, 4, 5]) {
    await prisma.grade.upsert({
      where: { number },
      create: { number },
      update: {},
    });
  }

  const grades = await prisma.grade.findMany({ orderBy: { number: "asc" } });
  const classRooms: { id: string; displayName: string; gradeId: string }[] = [];

  for (const g of grades) {
    for (const name of ["A", "B"]) {
      let section = await prisma.section.findFirst({ where: { gradeId: g.id, name } });
      if (!section) {
        section = await prisma.section.create({ data: { gradeId: g.id, name } });
      }
      const room = await prisma.classRoom.upsert({
        where: { gradeId_sectionId: { gradeId: g.id, sectionId: section.id } },
        create: { gradeId: g.id, sectionId: section.id, displayName: `Grade ${g.number}-${name}` },
        update: {},
      });
      classRooms.push(room);
    }
  }

  // 4. Subjects
  const subjectData = [
    { name: "Math", type: "THEORY" as const, requiresResource: false, resourceType: null as string | null },
    { name: "Science", type: "PRACTICAL" as const, requiresResource: true, resourceType: "SCIENCE_LAB" },
    { name: "English", type: "THEORY" as const, requiresResource: false, resourceType: null },
    { name: "Nepali", type: "THEORY" as const, requiresResource: false, resourceType: null },
    { name: "Computer", type: "PRACTICAL" as const, requiresResource: true, resourceType: "COMPUTER_LAB" },
    { name: "Music", type: "ECA" as const, requiresResource: false, resourceType: null },
    { name: "ECA", type: "ECA" as const, requiresResource: false, resourceType: null },
  ];

  const allSubjects = [];
  for (const s of subjectData) {
    const existingSubj = await prisma.subject.findFirst({ where: { name: s.name } });
    if (existingSubj) allSubjects.push(existingSubj);
    else allSubjects.push(await prisma.subject.create({ data: s }));
  }

  // 5. Resources (for Science & Computer)
  let sciLab = await prisma.resource.findFirst({ where: { name: "Science Lab 1" } });
  if (!sciLab) sciLab = await prisma.resource.create({ data: { name: "Science Lab 1", type: "SCIENCE_LAB", capacity: 1 } });

  let compLab = await prisma.resource.findFirst({ where: { name: "Computer Lab 1" } });
  if (!compLab) compLab = await prisma.resource.create({ data: { name: "Computer Lab 1", type: "COMPUTER_LAB", capacity: 1 } });

  // 6. Teachers: 14 so workload fits (10 classes × 7 subjects × ~4–5 periods; 14×30 = 420)
  const teacherData = [
    { name: "Teacher 1", type: "FULL_TIME" as const, maxPerWeek: 30, maxPerDay: 6 },
    { name: "Teacher 2", type: "FULL_TIME" as const, maxPerWeek: 30, maxPerDay: 6 },
    { name: "Teacher 3", type: "FULL_TIME" as const, maxPerWeek: 30, maxPerDay: 6 },
    { name: "Teacher 4", type: "FULL_TIME" as const, maxPerWeek: 30, maxPerDay: 6 },
    { name: "Teacher 5", type: "FULL_TIME" as const, maxPerWeek: 30, maxPerDay: 6 },
    { name: "Teacher 6", type: "FULL_TIME" as const, maxPerWeek: 30, maxPerDay: 6 },
    { name: "Teacher 7", type: "FULL_TIME" as const, maxPerWeek: 30, maxPerDay: 6 },
    { name: "Teacher 8", type: "FULL_TIME" as const, maxPerWeek: 30, maxPerDay: 6 },
    { name: "Teacher 9", type: "FULL_TIME" as const, maxPerWeek: 30, maxPerDay: 6 },
    { name: "Teacher 10", type: "FULL_TIME" as const, maxPerWeek: 30, maxPerDay: 6 },
    { name: "Teacher 11", type: "FULL_TIME" as const, maxPerWeek: 30, maxPerDay: 6 },
    { name: "Teacher 12", type: "FULL_TIME" as const, maxPerWeek: 30, maxPerDay: 6 },
    { name: "Teacher 13", type: "FULL_TIME" as const, maxPerWeek: 30, maxPerDay: 6 },
    { name: "Teacher 14", type: "FULL_TIME" as const, maxPerWeek: 30, maxPerDay: 6 },
  ];

  const allTeachers = [];
  for (const t of teacherData) {
    const existingT = await prisma.teacher.findFirst({ where: { name: t.name } });
    if (existingT) allTeachers.push(existingT);
    else allTeachers.push(await prisma.teacher.create({ data: t }));
  }

  // 7. Class teachers: teacher i for class i (0..9), then wrap
  for (let i = 0; i < classRooms.length; i++) {
    const classRoom = classRooms[i]!;
    const teacher = allTeachers[i % allTeachers.length]!;
    await prisma.classTeacher.upsert({
      where: { classId: classRoom.id },
      create: { classId: classRoom.id, teacherId: teacher.id },
      update: { teacherId: teacher.id },
    });
  }

  // 8. Subject assignments: spread so each teacher gets ~2 subjects, each subject has 2 teachers
  // Subject 0 (Math) -> teachers 0,1; Subject 1 (Science) -> 2,3; ... Subject 6 (ECA) -> 12,13
  // Class 0 gets Math from teacher 0, Science from 2, ... so (classIndex, subjectIndex) -> teacher at (subjectIndex*2 + classIndex % 2)
  for (const classRoom of classRooms) {
    const classIdx = classRooms.indexOf(classRoom);
    for (let s = 0; s < allSubjects.length; s++) {
      const subject = allSubjects[s]!;
      const teacherIdx = s * 2 + (classIdx % 2); // 2 teachers per subject
      const teacher = allTeachers[teacherIdx % allTeachers.length]!;
      await prisma.teacherAssignment.upsert({
        where: { classId_subjectId: { classId: classRoom.id, subjectId: subject.id } },
        create: { classId: classRoom.id, subjectId: subject.id, teacherId: teacher.id },
        update: { teacherId: teacher.id },
      }).catch(() => {});
    }
  }

  // 9. Grade mode: 1–3 GRADE_SYSTEM, 4–5 SUBJECT_SYSTEM
  for (const g of grades) {
    await prisma.gradeMode.upsert({
      where: { gradeId: g.id },
      create: { gradeId: g.id, mode: g.number <= 3 ? "GRADE_SYSTEM" : "SUBJECT_SYSTEM" },
      update: { mode: g.number <= 3 ? "GRADE_SYSTEM" : "SUBJECT_SYSTEM" },
    });
  }

  // 10. Subject requirements: sized to fit actual slots (LOWER: 3 free/day=18/wk, HIGHER: 5 free/day=30/wk)
  // Grade 1-3: 7 subjects × 2 = 14 ≤ 18. Grade 4-5: 7 × 4 = 28 ≤ 30.
  await prisma.subjectRequirement.deleteMany({});
  for (const g of grades) {
    for (const subject of allSubjects) {
      await prisma.subjectRequirement.create({
        data: {
          gradeId: g.id,
          subjectId: subject.id,
          periodsPerWeek: g.number <= 3 ? 2 : 4,
          allowDoublePeriod: subject.type === "PRACTICAL",
          maxPerDay: 2,
          avoidConsecutive: false,
        },
      });
    }
  }

  console.log("Seed completed. You can now generate a routine from Dashboard → Routine.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
