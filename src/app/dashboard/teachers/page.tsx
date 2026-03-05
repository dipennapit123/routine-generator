"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Pagination, TABLE_PAGE_SIZE } from "@/components/Pagination";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/components/Toast";

interface Teacher {
  id: string;
  name: string;
  type: string;
  maxPerWeek: number;
  maxPerDay: number;
}

interface ClassRoom {
  id: string;
  displayName: string;
  gradeId: string;
  sectionId: string;
}

interface ClassTeacherEntry {
  classId: string;
  teacherId: string;
}

interface Subject {
  id: string;
  name: string;
}

interface TeacherSubjectEntry {
  teacherId: string;
  subjectId: string;
}

const TEACHERS_KEY = "/api/teachers";
const CLASSES_KEY = "/api/classes";
const CLASS_TEACHER_KEY = "/api/class-teacher";
const SUBJECTS_KEY = "/api/subjects";
const TEACHER_SUBJECT_KEY = "/api/teacher-subject";
const TEACHER_GRADES_KEY = "/api/teacher-grades";
const GRADES_KEY = "/api/grades";
const FACULTIES_KEY = "/api/faculties";
const GROUPS_KEY = "/api/groups";
const SECTIONS_KEY = "/api/sections";

interface GradeOption {
  id: string;
  label: string;
  number: number | null;
}
interface FacultyOption {
  id: string;
  name: string;
  gradeId: string;
}
interface GroupOption {
  id: string;
  name: string;
  facultyId: string;
}
interface SectionOption {
  id: string;
  name: string;
  gradeId: string;
  facultyId: string | null;
  groupId: string | null;
}

function isFacultyEligibleGrade(g: { number: number | null; label: string }): boolean {
  if (g.number === 11 || g.number === 12) return true;
  return /bachelor|master/i.test(g.label);
}

export default function TeachersPage() {
  const { mutate } = useSWRConfig();
  const { data: listData, isLoading: listLoading } = useSWR<Teacher[]>(TEACHERS_KEY);
  const { data: classesData } = useSWR<ClassRoom[]>(CLASSES_KEY);
  const { data: ctData } = useSWR<ClassTeacherEntry[]>(CLASS_TEACHER_KEY);
  const { data: subjectsData } = useSWR<Subject[]>(SUBJECTS_KEY);
  const { data: tsData } = useSWR<{ teacherId: string; subjectId: string }[]>(TEACHER_SUBJECT_KEY);
  type GradeAssignment = { id?: string; gradeId: string; facultyId?: string | null; groupId?: string | null; sectionId?: string | null };
  const { data: tgData } = useSWR<{
    id: string;
    teacherId: string;
    gradeId: string;
    facultyId?: string | null;
    groupId?: string | null;
    sectionId?: string | null;
    grade?: { id: string; label: string };
    faculty?: { id: string; name: string };
    group?: { id: string; name: string };
    section?: { id: string; name: string };
  }[]>(TEACHER_GRADES_KEY);
  const { data: gradesData } = useSWR<GradeOption[]>(GRADES_KEY);
  const { data: facultiesData } = useSWR<FacultyOption[]>(FACULTIES_KEY);
  const { data: groupsData } = useSWR<GroupOption[]>(GROUPS_KEY);
  const { data: sectionsData } = useSWR<SectionOption[]>(SECTIONS_KEY);

  const list = Array.isArray(listData) ? listData : [];
  const classes = Array.isArray(classesData) ? classesData : [];
  const classTeacherList = Array.isArray(ctData) ? ctData : [];
  const subjects = Array.isArray(subjectsData) ? subjectsData : [];
  const teacherSubjectList = Array.isArray(tsData) ? tsData.map((x) => ({ teacherId: x.teacherId, subjectId: x.subjectId })) : [];
  const teacherGradeList = Array.isArray(tgData) ? tgData : [];
  const grades = Array.isArray(gradesData) ? gradesData : [];
  const faculties = Array.isArray(facultiesData) ? facultiesData : [];
  const groups = Array.isArray(groupsData) ? groupsData : [];
  const sections = Array.isArray(sectionsData) ? sectionsData : [];
  const loading = listLoading;

  const [teacherTablePage, setTeacherTablePage] = useState(1);
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<Teacher | null>(null);
  const [classSelector, setClassSelector] = useState({
    gradeId: "",
    facultyId: "",
    groupId: "",
    sectionId: "",
  });
  const [selectedGradeForAssignment, setSelectedGradeForAssignment] = useState("");
  const [form, setForm] = useState({
    name: "",
    type: "FULL_TIME" as "FULL_TIME" | "PART_TIME",
    maxPerWeek: 30,
    maxPerDay: 6,
    classTeacherFor: [] as string[],
    gradeAssignments: [] as GradeAssignment[],
    subjectsFor: [] as string[],
  });

  function openEdit(t: Teacher) {
    const classTeacherFor = classTeacherList
      .filter((ct) => ct.teacherId === t.id)
      .map((ct) => ct.classId);
    const gradeAssignments: GradeAssignment[] = teacherGradeList
      .filter((tg) => tg.teacherId === t.id)
      .map((tg) => ({
        id: tg.id,
        gradeId: tg.gradeId,
        facultyId: tg.facultyId ?? null,
        groupId: tg.groupId ?? null,
        sectionId: tg.sectionId ?? null,
      }));
    const subjectsFor = teacherSubjectList
      .filter((ts) => ts.teacherId === t.id)
      .map((ts) => ts.subjectId);
    setClassSelector({ gradeId: "", facultyId: "", groupId: "", sectionId: "" });
    setSelectedGradeForAssignment(gradeAssignments.length ? gradeAssignments[0].gradeId : "");
    setForm({
      name: t.name,
      type: t.type as "FULL_TIME" | "PART_TIME",
      maxPerWeek: t.maxPerWeek,
      maxPerDay: t.maxPerDay,
      classTeacherFor,
      gradeAssignments,
      subjectsFor,
    });
    setModal(t);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const teacherPayload = { name: form.name, type: form.type, maxPerWeek: form.maxPerWeek, maxPerDay: form.maxPerDay };
      let teacherId: string;
      if (modal?.id) {
        await fetch(`/api/teachers/${modal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(teacherPayload),
        });
        teacherId = modal.id;
        const previous = classTeacherList.filter((ct) => ct.teacherId === modal.id).map((ct) => ct.classId);
        const toAdd = form.classTeacherFor.filter((c) => !previous.includes(c));
        const toRemove = previous.filter((c) => !form.classTeacherFor.includes(c));
        for (const classId of toAdd) {
          await fetch("/api/class-teacher", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ classId, teacherId }),
          });
        }
        for (const classId of toRemove) {
          await fetch(`/api/class-teacher?classId=${encodeURIComponent(classId)}`, { method: "DELETE" });
        }
        // Update grades this teacher is assigned to
        const prevGradeAssignments = teacherGradeList.filter((tg) => tg.teacherId === modal.id);
        const toAddGrades = form.gradeAssignments.filter((a) => !a.id);
        const toRemoveGrades = prevGradeAssignments.filter(
          (p) =>
            !form.gradeAssignments.some(
              (f) =>
                f.gradeId === p.gradeId &&
                (f.facultyId || null) === (p.facultyId ?? null) &&
                (f.groupId || null) === (p.groupId ?? null) &&
                (f.sectionId || null) === (p.sectionId ?? null)
            )
        );
        for (const a of toAddGrades) {
          await fetch("/api/teacher-grades", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              teacherId,
              gradeId: a.gradeId,
              ...(a.facultyId && { facultyId: a.facultyId }),
              ...(a.groupId && { groupId: a.groupId }),
              ...(a.sectionId && { sectionId: a.sectionId }),
            }),
          });
        }
        for (const tg of toRemoveGrades) {
          await fetch(`/api/teacher-grades?id=${encodeURIComponent(tg.id)}`, { method: "DELETE" });
        }
        // Update subjects that this teacher can teach
        const prevSubjects = teacherSubjectList
          .filter((ts) => ts.teacherId === modal.id)
          .map((ts) => ts.subjectId);
        const subjectsToAdd = form.subjectsFor.filter((s) => !prevSubjects.includes(s));
        const subjectsToRemove = prevSubjects.filter((s) => !form.subjectsFor.includes(s));
        for (const subjectId of subjectsToAdd) {
          await fetch("/api/teacher-subject", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teacherId, subjectId }),
          });
        }
        for (const subjectId of subjectsToRemove) {
          await fetch(
            `/api/teacher-subject?teacherId=${encodeURIComponent(teacherId)}&subjectId=${encodeURIComponent(
              subjectId
            )}`,
            { method: "DELETE" }
          );
        }
        setForm({
          name: "",
          type: "FULL_TIME",
          maxPerWeek: 30,
          maxPerDay: 6,
          classTeacherFor: [],
          gradeAssignments: [],
          subjectsFor: [],
        });
        toast.success("Teacher updated");
        setModal(null);
      } else {
        const res = await fetch("/api/teachers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(teacherPayload),
        });
        const created = await res.json();
        teacherId = created?.id;
        if (teacherId) {
          if (form.classTeacherFor.length > 0) {
            for (const classId of form.classTeacherFor) {
              await fetch("/api/class-teacher", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ classId, teacherId }),
              });
            }
          }
          for (const a of form.gradeAssignments) {
            await fetch("/api/teacher-grades", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                teacherId,
                gradeId: a.gradeId,
                ...(a.facultyId && { facultyId: a.facultyId }),
                ...(a.groupId && { groupId: a.groupId }),
              }),
            });
          }
          if (form.subjectsFor.length > 0) {
            for (const subjectId of form.subjectsFor) {
              await fetch("/api/teacher-subject", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teacherId, subjectId }),
              });
            }
          }
        }
        setForm({
          name: "",
          type: "FULL_TIME",
          maxPerWeek: 30,
          maxPerDay: 6,
          classTeacherFor: [],
          gradeAssignments: [],
          subjectsFor: [],
        });
        toast.success("Teacher added");
      }
      setModal(null);
      void mutate(TEACHERS_KEY);
      void mutate(CLASS_TEACHER_KEY);
      void mutate(TEACHER_GRADES_KEY);
      void mutate(TEACHER_SUBJECT_KEY);
    } catch {
      toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTeacher(id: string) {
    if (!confirm("Delete?")) return;
    try {
      await fetch(`/api/teachers/${id}`, { method: "DELETE" });
      void mutate(TEACHERS_KEY);
      void mutate(CLASS_TEACHER_KEY);
      void mutate(TEACHER_GRADES_KEY);
    } catch {
      alert("Failed.");
    }
  }

  /** Inline form fields shared by Add and Edit sections */
  function TeacherFields() {
    return (
      <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="input mt-1.5 w-full"
              placeholder="Teacher name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof form.type }))}
              className="input mt-1.5 w-full"
            >
              <option value="FULL_TIME">FULL_TIME</option>
              <option value="PART_TIME">PART_TIME</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Max periods per week</label>
            <input
              type="number"
              min={1}
              max={50}
              value={form.maxPerWeek}
              onChange={(e) => setForm((f) => ({ ...f, maxPerWeek: Number(e.target.value) }))}
              className="input mt-1.5 w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Max periods per day</label>
            <input
              type="number"
              min={1}
              max={10}
              value={form.maxPerDay}
              onChange={(e) => setForm((f) => ({ ...f, maxPerDay: Number(e.target.value) }))}
              className="input mt-1.5 w-full"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Grades assigned to (optional)</label>
          <p className="text-xs text-slate-500 mb-2">Check a grade to select it; Faculty, Group, and Section columns will show options for that grade on the right.</p>
          <div className="flex flex-nowrap gap-4 overflow-x-auto rounded border border-slate-300 bg-slate-50 p-3">
            {/* Column 1: Grade */}
            <div className="min-w-[100px] shrink-0 space-y-1.5">
              <div className="text-xs font-semibold uppercase text-slate-500">Grade</div>
              {grades.map((g) => {
                const hasGrade = form.gradeAssignments.some((a) => a.gradeId === g.id);
                return (
                  <label key={g.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={hasGrade}
                      onChange={() => {
                        if (hasGrade) {
                          setForm((f) => ({
                            ...f,
                            gradeAssignments: f.gradeAssignments.filter((a) => a.gradeId !== g.id),
                          }));
                          if (selectedGradeForAssignment === g.id) {
                            const remaining = form.gradeAssignments.filter((a) => a.gradeId !== g.id);
                            setSelectedGradeForAssignment(remaining.length ? remaining[0].gradeId : "");
                          }
                        } else {
                          setForm((f) => ({
                            ...f,
                            gradeAssignments: [...f.gradeAssignments, { gradeId: g.id }],
                          }));
                          setSelectedGradeForAssignment(g.id);
                        }
                      }}
                      className="rounded border-slate-300"
                    />
                    <span>{g.label}</span>
                  </label>
                );
              })}
            </div>
            {/* Column 2: Faculty */}
            <div className="min-w-[100px] shrink-0 space-y-1.5 border-l border-slate-200 pl-3">
              <div className="text-xs font-semibold uppercase text-slate-500">Faculty</div>
              {selectedGradeForAssignment && (() => {
                const g = grades.find((x) => x.id === selectedGradeForAssignment);
                if (!g || !isFacultyEligibleGrade(g)) return <span className="text-xs text-slate-400">—</span>;
                const gradeFaculties = faculties.filter((f) => f.gradeId === g.id);
                return gradeFaculties.length === 0 ? (
                  <span className="text-xs text-slate-400">None</span>
                ) : (
                  gradeFaculties.map((f) => {
                    const isSelected = form.gradeAssignments.some(
                      (a) => a.gradeId === g.id && a.facultyId === f.id && !a.groupId && !a.sectionId
                    );
                    return (
                      <label key={f.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setForm((f2) => ({
                                ...f2,
                                gradeAssignments: f2.gradeAssignments.filter(
                                  (a) => !(a.gradeId === g.id && a.facultyId === f.id && !a.groupId && !a.sectionId)
                                ),
                              }));
                            } else {
                              setForm((f2) => ({
                                ...f2,
                                gradeAssignments: [...f2.gradeAssignments, { gradeId: g.id, facultyId: f.id }],
                              }));
                            }
                          }}
                          className="rounded border-slate-300"
                        />
                        <span>{f.name}</span>
                      </label>
                    );
                  })
                );
              })()}
            </div>
            {/* Column 3: Group */}
            <div className="min-w-[100px] shrink-0 space-y-1.5 border-l border-slate-200 pl-3">
              <div className="text-xs font-semibold uppercase text-slate-500">Group</div>
              {selectedGradeForAssignment && (() => {
                const g = grades.find((x) => x.id === selectedGradeForAssignment);
                if (!g || !isFacultyEligibleGrade(g)) return <span className="text-xs text-slate-400">—</span>;
                const gradeFaculties = faculties.filter((f) => f.gradeId === g.id);
                const gradeGroups = gradeFaculties.flatMap((f) =>
                  groups.filter((gr) => gr.facultyId === f.id).map((gr) => ({ ...gr, facultyId: f.id }))
                );
                return gradeGroups.length === 0 ? (
                  <span className="text-xs text-slate-400">None</span>
                ) : (
                  gradeGroups.map((gr) => {
                    const isSelected = form.gradeAssignments.some(
                      (a) => a.gradeId === g.id && a.facultyId === gr.facultyId && a.groupId === gr.id
                    );
                    return (
                      <label key={gr.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setForm((f2) => ({
                                ...f2,
                                gradeAssignments: f2.gradeAssignments.filter(
                                  (a) => !(a.gradeId === g.id && a.facultyId === gr.facultyId && a.groupId === gr.id)
                                ),
                              }));
                            } else {
                              setForm((f2) => ({
                                ...f2,
                                gradeAssignments: [
                                  ...f2.gradeAssignments,
                                  { gradeId: g.id, facultyId: gr.facultyId, groupId: gr.id },
                                ],
                              }));
                            }
                          }}
                          className="rounded border-slate-300"
                        />
                        <span>{gr.name}</span>
                      </label>
                    );
                  })
                );
              })()}
            </div>
            {/* Column 4: Section */}
            <div className="min-w-[100px] shrink-0 space-y-1.5 border-l border-slate-200 pl-3">
              <div className="text-xs font-semibold uppercase text-slate-500">Section</div>
              {selectedGradeForAssignment && (() => {
                const g = grades.find((x) => x.id === selectedGradeForAssignment);
                if (!g) return <span className="text-xs text-slate-400">—</span>;
                const sectionsForGrade = sections.filter((s) => s.gradeId === g.id);
                return sectionsForGrade.length === 0 ? (
                  <span className="text-xs text-slate-400">None</span>
                ) : (
                  sectionsForGrade.map((sec) => {
                    const isSelected = form.gradeAssignments.some(
                      (a) => a.gradeId === g.id && a.sectionId === sec.id
                    );
                    return (
                      <label key={sec.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setForm((f2) => ({
                                ...f2,
                                gradeAssignments: f2.gradeAssignments.filter(
                                  (a) => !(a.gradeId === g.id && a.sectionId === sec.id)
                                ),
                              }));
                            } else {
                              setForm((f2) => ({
                                ...f2,
                                gradeAssignments: [
                                  ...f2.gradeAssignments,
                                  { gradeId: g.id, sectionId: sec.id },
                                ],
                              }));
                            }
                          }}
                          className="rounded border-slate-300"
                        />
                        <span>{sec.name}</span>
                      </label>
                    );
                  })
                );
              })()}
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Class teacher for (optional)</label>
          <p className="text-xs text-slate-500 mb-2">Select grade, then section (Nursery–Grade 10) or faculty + group + section (Grade 11, 12, Bachelor, Master).</p>
          {(() => {
            const selectedGrade = grades.find((g) => g.id === classSelector.gradeId);
            const isFacultyGrade = selectedGrade && isFacultyEligibleGrade(selectedGrade);
            const facultiesForGrade = faculties.filter((f) => f.gradeId === classSelector.gradeId);
            const groupsForFaculty = groups.filter((g) => g.facultyId === classSelector.facultyId);
            // For all grades (including 11, 12, Bachelor, Master): show all sections for the selected grade so "Add class" always has options
            const sectionsForSelection = sections.filter((s) => s.gradeId === classSelector.gradeId);
            function sectionLabel(sec: SectionOption) {
              if (!sec.facultyId) return sec.name;
              const fac = faculties.find((f) => f.id === sec.facultyId);
              const grp = sec.groupId ? groups.find((g) => g.id === sec.groupId) : null;
              return grp ? `${sec.name} (${fac?.name ?? ""} - ${grp.name})` : `${sec.name} (${fac?.name ?? ""})`;
            }
            async function addClassBySelection() {
              if (!classSelector.sectionId || !classSelector.gradeId) return;
              let cls = classes.find((c) => c.sectionId === classSelector.sectionId);
              if (!cls) {
                // Class may not exist yet for this section (e.g. 11, 12, Bachelor, Master); create it so "Add class" works
                try {
                  const res = await fetch("/api/classes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      gradeId: classSelector.gradeId,
                      sectionId: classSelector.sectionId,
                    }),
                  });
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    alert(err?.error ?? "Failed to create class");
                    return;
                  }
                  const created = await res.json();
                  cls = { id: created.id, displayName: created.displayName, gradeId: created.gradeId, sectionId: created.sectionId };
                  mutate(CLASSES_KEY, (prev: ClassRoom[] | undefined) => (prev ? [...prev, cls!] : [cls!]), false);
                } catch (e) {
                  console.error(e);
                  alert("Failed to create class");
                  return;
                }
              }
              if (cls && !form.classTeacherFor.includes(cls.id)) {
                setForm((f) => ({ ...f, classTeacherFor: [...f.classTeacherFor, cls!.id] }));
              }
            }
            return (
              <>
                <div className="flex flex-wrap gap-2 mb-2">
                  <select
                    value={classSelector.gradeId}
                    onChange={(e) =>
                      setClassSelector((s) => ({
                        ...s,
                        gradeId: e.target.value,
                        facultyId: "",
                        groupId: "",
                        sectionId: "",
                      }))
                    }
                    className="rounded border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select grade</option>
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>{g.label}</option>
                    ))}
                  </select>
                  {classSelector.gradeId && isFacultyGrade && (
                    <>
                      <select
                        value={classSelector.facultyId}
                        onChange={(e) =>
                          setClassSelector((s) => ({ ...s, facultyId: e.target.value, groupId: "", sectionId: "" }))
                        }
                        className="rounded border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="">Select faculty</option>
                        {facultiesForGrade.map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                      <select
                        value={classSelector.groupId}
                        onChange={(e) =>
                          setClassSelector((s) => ({ ...s, groupId: e.target.value, sectionId: "" }))
                        }
                        className="rounded border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="">No group / any</option>
                        {groupsForFaculty.map((gr) => (
                          <option key={gr.id} value={gr.id}>{gr.name}</option>
                        ))}
                      </select>
                    </>
                  )}
                  {classSelector.gradeId && (
                    <select
                      value={classSelector.sectionId}
                      onChange={(e) => setClassSelector((s) => ({ ...s, sectionId: e.target.value }))}
                      className="rounded border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">Select section</option>
                      {sectionsForSelection.map((sec) => (
                        <option key={sec.id} value={sec.id}>{sectionLabel(sec)}</option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => addClassBySelection()}
                    disabled={!classSelector.sectionId || !classSelector.gradeId}
                    className="btn-secondary text-sm"
                  >
                    Add class
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 rounded border border-slate-300 bg-slate-50 p-2 min-h-[2.5rem]">
                  {form.classTeacherFor.map((classId) => {
                    const cls = classes.find((c) => c.id === classId);
                    return (
                      <span
                        key={classId}
                        className="inline-flex items-center gap-1 rounded bg-slate-200 px-2 py-1 text-sm"
                      >
                        {cls?.displayName ?? classId}
                        <button
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              classTeacherFor: f.classTeacherFor.filter((id) => id !== classId),
                            }))
                          }
                          className="text-slate-600 hover:text-red-600"
                          aria-label="Remove"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                  {form.classTeacherFor.length === 0 && (
                    <span className="text-sm text-slate-500">No classes selected</span>
                  )}
                </div>
              </>
            );
          })()}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Subjects they can teach (optional)</label>
          <p className="text-xs text-slate-500 mb-1">Used to suggest teachers in Appointing when you pick a subject.</p>
          <div className="max-h-28 overflow-y-auto rounded border border-slate-300 bg-slate-50 p-2 space-y-1.5">
            {subjects.length === 0 ? (
              <p className="text-sm text-slate-500">No subjects yet. Add subjects first.</p>
            ) : (
              subjects.map((s) => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.subjectsFor.includes(s.id)}
                    onChange={(e) => {
                      if (e.target.checked) setForm((f) => ({ ...f, subjectsFor: [...f.subjectsFor, s.id] }));
                      else setForm((f) => ({ ...f, subjectsFor: f.subjectsFor.filter((id) => id !== s.id) }));
                    }}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm">{s.name}</span>
                </label>
              ))
            )}
          </div>
        </div>
      </>
    );
  }

  if (loading) return <p className="loading-text">Loading...</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="page-title mb-0">Teacher list</h1>
        <Link href="/dashboard/teachers/add" className="btn-primary">Add Teacher</Link>
      </div>

      {/* Teachers table */}
      <section>
        <div className="table-wrapper">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Max/week</th>
                <th>Max/day</th>
                <th>Grades assigned to</th>
                <th>Class teacher for</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list
                .slice((teacherTablePage - 1) * TABLE_PAGE_SIZE, teacherTablePage * TABLE_PAGE_SIZE)
                .map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.name}</td>
                  <td>{t.type}</td>
                  <td>{t.maxPerWeek}</td>
                  <td>{t.maxPerDay}</td>
                  <td className="text-sm text-slate-600">
                    {teacherGradeList
                      .filter((tg) => tg.teacherId === t.id)
                      .map((tg) =>
                        [tg.grade?.label, tg.faculty?.name, tg.group?.name, tg.section?.name].filter(Boolean).join(" – ")
                      )
                      .join(", ") || "—"}
                  </td>
                  <td className="text-sm text-slate-600">
                    {classTeacherList
                      .filter((ct) => ct.teacherId === t.id)
                      .map((ct) => classes.find((c) => c.id === ct.classId)?.displayName ?? ct.classId)
                      .join(", ") || "—"}
                  </td>
                  <td>
                    <button type="button" onClick={() => openEdit(t)} className="text-indigo-600 hover:underline mr-2">
                      Edit
                    </button>
                    <a href={`/dashboard/availability?teacherId=${t.id}`} className="text-slate-600 hover:underline mr-2">
                      Availability
                    </a>
                    <button type="button" onClick={() => deleteTeacher(t.id)} className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          totalItems={list.length}
          currentPage={teacherTablePage}
          pageSize={TABLE_PAGE_SIZE}
          onPageChange={setTeacherTablePage}
          label="teachers"
        />
      </section>

      {/* Sub-section: Edit Teacher (inline, when a teacher is selected) */}
      {modal?.id && (
        <section className="mt-8 rounded-lg border border-indigo-200 bg-indigo-50/30 p-4 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-800">Edit Teacher: {modal.name}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(e);
            }}
            className="space-y-4"
          >
            <TeacherFields />
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
              {saving ? <Spinner /> : null}
              {saving ? "Saving…" : "Save changes"}
            </button>
              <button type="button" onClick={() => { setModal(null); }} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
