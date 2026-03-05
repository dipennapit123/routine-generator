"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";

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

interface TeacherSubjectEntry {
  teacherId: string;
  subjectId: string;
}

const ASSIGNMENTS_KEY = "/api/assignments";
const CLASSES_KEY = "/api/classes";
const SUBJECTS_KEY = "/api/subjects";
const TEACHERS_KEY = "/api/teachers";
const GRADES_KEY = "/api/grades";
const TEACHER_SUBJECT_KEY = "/api/teacher-subject";
const CLASS_TEACHER_KEY = "/api/class-teacher";
const GRADE_MODES_KEY = "/api/grade-modes";

export default function AssignmentsPage() {
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
    } catch {
      alert("Failed.");
    }
  }

  async function handleSubjectAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!form.classId || !form.subjectId || !form.teacherId) return;
    try {
      await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm({ classId: "", subjectId: "", teacherId: "" });
      setEditingKey(null);
      void mutate(ASSIGNMENTS_KEY);
    } catch {
      alert("Failed.");
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
    } catch {
      alert("Failed.");
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
    } catch {
      alert("Failed.");
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

  return (
    <div>
      <h1 className="page-title mb-8">Assignments</h1>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold text-slate-800">Grade Mode (Grade System vs Subject System)</h2>
        <p className="mb-2 text-sm text-slate-600">Grade 1–3 often use Grade System (one class teacher for most subjects).</p>
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

      <section className="mb-8">
        <h2 className="mb-2 font-semibold text-slate-800">Class Teacher (per class)</h2>
        <div className="space-y-2">
          {classes.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <span className="w-32">{c.displayName}</span>
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

      <section>
        <h2 className="mb-2 font-semibold text-slate-800">Subject Teacher (per class + subject)</h2>
        {editingKey && (
          <p className="mb-2 text-xs text-slate-600">
            Editing assignment for{" "}
            <strong>
              {
                classes.find((c) => c.id === editingKey.classId)?.displayName ??
                editingKey.classId
              }{" "}
              – {subjects.find((s) => s.id === editingKey.subjectId)?.name ?? editingKey.subjectId}
            </strong>
            . Change the teacher and click Save, or Cancel to add a new assignment instead.
          </p>
        )}
        <form onSubmit={handleSubjectAssignment} className="mb-4 flex flex-wrap gap-2">
          <select
            value={form.classId}
            onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
            disabled={!!editingKey}
            className="rounded border border-slate-300 px-3 py-2"
          >
            <option value="">Class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName}
              </option>
            ))}
          </select>
          <select
            value={form.subjectId}
            onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
            disabled={!!editingKey}
            className="rounded border border-slate-300 px-3 py-2"
          >
            <option value="">Subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={form.teacherId}
            onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}
            className="rounded border border-slate-300 px-3 py-2"
          >
            <option value="">Teacher</option>
            {teacherOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary">
            {editingKey ? "Save" : "Assign"}
          </button>
          {editingKey && (
            <button
              type="button"
              onClick={() => {
                setEditingKey(null);
                setForm({ classId: "", subjectId: "", teacherId: "" });
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
          )}
        </form>
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
            {assignments.map((a) => (
              <tr key={a.id}>
                <td className="font-medium">{a.classRoom?.displayName ?? a.classId}</td>
                <td>{a.subject?.name ?? a.subjectId}</td>
                <td>{a.teacher?.name ?? a.teacherId}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingKey({ classId: a.classId, subjectId: a.subjectId });
                      setForm({
                        classId: a.classId,
                        subjectId: a.subjectId,
                        teacherId: a.teacherId,
                      });
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
      </section>
    </div>
  );
}
