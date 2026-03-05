"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Pagination, TABLE_PAGE_SIZE } from "@/components/Pagination";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/components/Toast";

type AssignmentsTab = "grade-mode" | "class-teacher" | "class-teacher-list";

interface ClassRoom {
  id: string;
  displayName: string;
}
interface Subject {
  id: string;
  name: string;
}
interface Teacher {
  id: string;
  name: string;
}
interface Assignment {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  classRoom?: ClassRoom;
  subject?: Subject;
  teacher?: Teacher;
}

const ASSIGNMENTS_KEY = "/api/assignments";
const CLASSES_KEY = "/api/classes";
const SUBJECTS_KEY = "/api/subjects";
const TEACHERS_KEY = "/api/teachers";
const GRADES_KEY = "/api/grades";
const TEACHER_SUBJECT_KEY = "/api/teacher-subject";
const CLASS_TEACHER_KEY = "/api/class-teacher";
const GRADE_MODES_KEY = "/api/grade-modes";

const TAB_IDS: AssignmentsTab[] = ["grade-mode", "class-teacher", "class-teacher-list"];
function isValidTab(t: string | null): t is AssignmentsTab {
  return t !== null && TAB_IDS.includes(t as AssignmentsTab);
}

function AssignmentsPageContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: AssignmentsTab = isValidTab(tabParam) ? tabParam : "grade-mode";

  const { mutate } = useSWRConfig();
  const { data: assignmentsData, isLoading: assignmentsLoading } = useSWR<Assignment[]>(ASSIGNMENTS_KEY);
  const { data: classesData, isLoading: classesLoading } = useSWR<ClassRoom[]>(CLASSES_KEY);
  const { data: subjectsData, isLoading: subjectsLoading } = useSWR<Subject[]>(SUBJECTS_KEY);
  const { data: teachersData, isLoading: teachersLoading } = useSWR<Teacher[]>(TEACHERS_KEY);
  const { data: gradesData, isLoading: gradesLoading } = useSWR<{ id: string; number: number | null; label: string }[]>(GRADES_KEY);
  const { data: tsData } = useSWR<{ teacherId: string; subjectId: string }[]>(TEACHER_SUBJECT_KEY);
  const { data: ctData } = useSWR<{ classId: string; teacherId: string }[]>(CLASS_TEACHER_KEY);
  const { data: gmData } = useSWR<{ gradeId: string; mode: string }[]>(GRADE_MODES_KEY);

  const assignments = Array.isArray(assignmentsData) ? assignmentsData : [];
  const classes = Array.isArray(classesData) ? classesData : [];
  const subjects = Array.isArray(subjectsData) ? subjectsData : [];
  const teachers = Array.isArray(teachersData) ? teachersData : [];
  const grades = Array.isArray(gradesData) ? gradesData : [];
  const teacherSubjects = Array.isArray(tsData) ? tsData.map((x) => ({ teacherId: x.teacherId, subjectId: x.subjectId })) : [];
  const classTeacherMap = Array.isArray(ctData) ? Object.fromEntries(ctData.map((ct) => [ct.classId, ct.teacherId])) : {};
  const gradeModes = Array.isArray(gmData) ? Object.fromEntries(gmData.map((gm) => [gm.gradeId, gm.mode])) : {};

  const loading = assignmentsLoading || classesLoading || subjectsLoading || teachersLoading || gradesLoading;
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [tablePage, setTablePage] = useState(1);
  const [form, setForm] = useState({ classId: "", subjectId: "", teacherId: "" });
  const [editingKey, setEditingKey] = useState<{ classId: string; subjectId: string } | null>(null);

  async function handleClassTeacher(classId: string, teacherId: string) {
    try {
      await fetch("/api/class-teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, teacherId }),
      });
      void mutate(CLASS_TEACHER_KEY);
      toast.success("Class teacher updated");
    } catch {
      toast.error("Failed to update.");
    }
  }

  async function handleSubjectAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!form.classId || !form.subjectId || !form.teacherId) return;
    setSaving(true);
    try {
      await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm({ classId: "", subjectId: "", teacherId: "" });
      setEditingKey(null);
      void mutate(ASSIGNMENTS_KEY);
      toast.success("Assignment added");
    } catch {
      toast.error("Failed to add assignment.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAssignment(classId: string, subjectId: string) {
    try {
      await fetch(`/api/assignments?classId=${classId}&subjectId=${subjectId}`, { method: "DELETE" });
      void mutate(ASSIGNMENTS_KEY);
      if (editingKey && editingKey.classId === classId && editingKey.subjectId === subjectId) {
        setEditingKey(null);
        setForm({ classId: "", subjectId: "", teacherId: "" });
      }
      toast.success("Assignment removed");
    } catch {
      toast.error("Failed to remove.");
    }
  }

  async function setGradeMode(gradeId: string, mode: string) {
    try {
      await fetch("/api/grade-modes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradeId, mode }),
      });
      void mutate(GRADE_MODES_KEY);
      toast.success("Grade mode updated");
    } catch {
      toast.error("Failed to update.");
    }
  }

  if (loading) return <p className="loading-text">Loading...</p>;

  const currentSubjectId = form.subjectId;
  const teachersForSubject = currentSubjectId
    ? teacherSubjects.filter((ts) => ts.subjectId === currentSubjectId)
    : [];
  const teacherOptions =
    currentSubjectId && teachersForSubject.length > 0
      ? teachers.filter(
          (t) =>
            teachersForSubject.some((ts) => ts.teacherId === t.id) ||
            t.id === form.teacherId
        )
      : teachers;

  const subTabs: { id: AssignmentsTab; label: string }[] = [
    { id: "grade-mode", label: "Grade mode" },
    { id: "class-teacher", label: "Class teacher" },
    { id: "class-teacher-list", label: "Class teacher list" },
  ];

  return (
    <div>
      <h1 className="page-title mb-6">Appointing</h1>

      <nav
        className="mb-8 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
        aria-label="Appointing sections"
      >
        {subTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/dashboard/assignments?tab=${tab.id}`}
              className={`inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {activeTab === "grade-mode" && (
        <section>
          <h2 className="mb-2 font-semibold text-slate-800">Grade Mode (Grade System vs Subject System)</h2>
          <p className="mb-4 text-sm text-slate-600">Grade 1–3 often use Grade System (one class teacher for most subjects).</p>
          <div className="flex flex-wrap gap-4">
            {grades.map((g) => {
              const label = g.label ?? (g.number != null ? `Grade ${g.number}` : "Grade");
              return (
                <div
                  key={g.id}
                  className="flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2"
                >
                  <span className="font-medium">{label}</span>
                  <select
                    value={gradeModes[g.id] ?? "SUBJECT_SYSTEM"}
                    onChange={(e) => setGradeMode(g.id, e.target.value)}
                    className="rounded border border-slate-300 px-2 py-1 text-sm"
                  >
                    <option value="GRADE_SYSTEM">Grade System</option>
                    <option value="SUBJECT_SYSTEM">Subject System</option>
                  </select>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === "class-teacher" && (
        <section>
          <h2 className="mb-2 font-semibold text-slate-800">Class Teacher (per class)</h2>
          <p className="mb-4 text-sm text-slate-600">Assign one class teacher per class.</p>
          <div className="space-y-2">
            {classes.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="w-32 font-medium">{c.displayName}</span>
                <select
                  value={classTeacherMap[c.id] ?? ""}
                  onChange={(e) => handleClassTeacher(c.id, e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1"
                >
                  <option value="">—</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === "class-teacher-list" && (
        <>
          <section className="mb-8">
            <h2 className="mb-2 font-semibold text-slate-800">Class teacher list</h2>
            <p className="mb-4 text-sm text-slate-600">List of classes and their assigned class teacher.</p>
            <div className="table-wrapper">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Class teacher</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((c) => (
                    <tr key={c.id}>
                      <td className="font-medium">{c.displayName}</td>
                      <td>
                        {classTeacherMap[c.id]
                          ? teachers.find((t) => t.id === classTeacherMap[c.id])?.name ?? "—"
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-slate-800">Subject Teacher (per class + subject)</h2>
            <p className="mb-4 text-sm text-slate-600">Assign teachers to teach subjects for each class. <Link href="/dashboard/assignments/add" className="text-indigo-600 hover:underline">Add assignment</Link>.</p>
            {editingKey ? (
              <>
                <p className="mb-2 text-xs text-slate-600">
                  Editing assignment for{" "}
                  <strong>
                    {classes.find((c) => c.id === editingKey.classId)?.displayName ?? editingKey.classId}{" "}
                    – {subjects.find((s) => s.id === editingKey.subjectId)?.name ?? editingKey.subjectId}
                  </strong>
                  . Change the teacher and click Save, or Cancel.
                </p>
                <form onSubmit={handleSubjectAssignment} className="mb-4 flex flex-wrap gap-2">
                  <select value={form.classId} disabled className="rounded border border-slate-300 px-3 py-2">
                    <option value={form.classId}>{classes.find((c) => c.id === form.classId)?.displayName ?? form.classId}</option>
                  </select>
                  <select value={form.subjectId} disabled className="rounded border border-slate-300 px-3 py-2">
                    <option value={form.subjectId}>{subjects.find((s) => s.id === form.subjectId)?.name ?? form.subjectId}</option>
                  </select>
                  <select
                    value={form.teacherId}
                    onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}
                    className="rounded border border-slate-300 px-3 py-2"
                  >
                    <option value="">Teacher</option>
                    {teacherOptions.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
                    {saving ? <Spinner /> : null}
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingKey(null); setForm({ classId: "", subjectId: "", teacherId: "" }); }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </form>
              </>
            ) : null}
            <div className="table-wrapper">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Subject</th>
                    <th>Teacher</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments
                    .slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE)
                    .map((a) => (
                    <tr key={a.id}>
                      <td className="font-medium">{a.classRoom?.displayName ?? a.classId}</td>
                      <td>{a.subject?.name ?? a.subjectId}</td>
                      <td>{a.teacher?.name ?? a.teacherId}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingKey({ classId: a.classId, subjectId: a.subjectId });
                            setForm({ classId: a.classId, subjectId: a.subjectId, teacherId: a.teacherId });
                          }}
                          className="text-indigo-600 hover:underline mr-2"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteAssignment(a.classId, a.subjectId)}
                          className="text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              totalItems={assignments.length}
              currentPage={tablePage}
              pageSize={TABLE_PAGE_SIZE}
              onPageChange={setTablePage}
              label="assignments"
            />
          </section>
        </>
      )}
    </div>
  );
}

export default function AssignmentsPage() {
  return (
    <Suspense fallback={<p className="loading-text">Loading...</p>}>
      <AssignmentsPageContent />
    </Suspense>
  );
}
