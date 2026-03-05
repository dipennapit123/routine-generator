"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/components/Toast";

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
interface ClassRoom {
  id: string;
  displayName: string;
  gradeId: string;
  sectionId: string;
}
interface Subject {
  id: string;
  name: string;
}

function isFacultyEligibleGrade(g: { number: number | null; label: string }): boolean {
  if (g.number === 11 || g.number === 12) return true;
  return /bachelor|master/i.test(g.label);
}

export default function AddTeacherPage() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const { data: gradesData } = useSWR<GradeOption[]>(GRADES_KEY);
  const { data: facultiesData } = useSWR<FacultyOption[]>(FACULTIES_KEY);
  const { data: groupsData } = useSWR<GroupOption[]>(GROUPS_KEY);
  const { data: sectionsData } = useSWR<SectionOption[]>(SECTIONS_KEY);
  const { data: classesData } = useSWR<ClassRoom[]>(CLASSES_KEY);
  const { data: subjectsData } = useSWR<Subject[]>(SUBJECTS_KEY);

  const grades = Array.isArray(gradesData) ? gradesData : [];
  const faculties = Array.isArray(facultiesData) ? facultiesData : [];
  const groups = Array.isArray(groupsData) ? groupsData : [];
  const sections = Array.isArray(sectionsData) ? sectionsData : [];
  const classes = Array.isArray(classesData) ? classesData : [];
  const subjects = Array.isArray(subjectsData) ? subjectsData : [];

  type GradeAssignment = { gradeId: string; facultyId?: string; groupId?: string; sectionId?: string };
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
  const [classSelector, setClassSelector] = useState({
    gradeId: "",
    facultyId: "",
    groupId: "",
    sectionId: "",
  });

  const selectedGrade = grades.find((g) => g.id === classSelector.gradeId);
  const isFacultyGrade = selectedGrade && isFacultyEligibleGrade(selectedGrade);
  const facultiesForGrade = faculties.filter((f) => f.gradeId === classSelector.gradeId);
  const groupsForFaculty = groups.filter((g) => g.facultyId === classSelector.facultyId);
  // For all grades (including 11, 12, Bachelor, Master): show all sections for the selected grade so "Add class" always works
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          maxPerWeek: form.maxPerWeek,
          maxPerDay: form.maxPerDay,
        }),
      });
      const created = await res.json();
      const teacherId = created?.id;
      if (!teacherId) {
        alert("Failed to create teacher.");
        return;
      }
      for (const classId of form.classTeacherFor) {
        await fetch("/api/class-teacher", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId, teacherId }),
        });
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
            ...(a.sectionId && { sectionId: a.sectionId }),
          }),
        });
      }
      for (const subjectId of form.subjectsFor) {
        await fetch("/api/teacher-subject", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teacherId, subjectId }),
        });
      }
      void mutate("/api/teachers");
      void mutate(CLASS_TEACHER_KEY);
      void mutate(TEACHER_GRADES_KEY);
      void mutate(TEACHER_SUBJECT_KEY);
      toast.success("Teacher added");
      router.push("/dashboard/teachers");
    } catch {
      toast.error("Failed to add teacher.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
        <Link href="/dashboard/teachers" className="hover:underline">Teachers</Link>
        <span>/</span>
        <span className="font-medium text-slate-800">Add Teacher</span>
      </div>
      <h1 className="page-title mb-6">Add Teacher</h1>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
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
              {/* Column 2: Faculty (only for 11/12/Bachelor/Master when that grade is selected) */}
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
              {/* Column 3: Group (only for 11/12/Bachelor/Master when that grade is selected) */}
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
              {/* Column 4: Section (when a grade is selected) */}
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
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subjects they can teach (optional)</label>
            <div className="max-h-28 overflow-y-auto rounded border border-slate-300 bg-slate-50 p-2 space-y-1.5">
              {subjects.map((s) => (
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
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
            {saving ? <Spinner /> : null}
            {saving ? "Adding…" : "Add Teacher"}
          </button>
            <Link href="/dashboard/teachers" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </section>
    </div>
  );
}
