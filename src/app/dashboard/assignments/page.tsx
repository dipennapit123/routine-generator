"use client";

import { useEffect, useState } from "react";

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

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [grades, setGrades] = useState<{ id: string; number: number | null; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ classId: "", subjectId: "", teacherId: "" });
  const [editingKey, setEditingKey] = useState<{ classId: string; subjectId: string } | null>(null);
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubjectEntry[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/assignments").then((r) => r.json()),
      fetch("/api/classes").then((r) => r.json()),
      fetch("/api/subjects").then((r) => r.json()),
      fetch("/api/teachers").then((r) => r.json()),
      fetch("/api/grades").then((r) => r.json()),
      fetch("/api/teacher-subject").then((r) => r.json()).catch(() => []),
    ]).then(([a, c, s, t, g, ts]) => {
      setAssignments(Array.isArray(a) ? a : []);
      setClasses(Array.isArray(c) ? c : []);
      setSubjects(Array.isArray(s) ? s : []);
      setTeachers(Array.isArray(t) ? t : []);
      setGrades(Array.isArray(g) ? g : []);
      if (Array.isArray(ts)) {
        setTeacherSubjects(
          ts.map((x: any) => ({ teacherId: x.teacherId, subjectId: x.subjectId }))
        );
      }
      setLoading(false);
    });
  }, []);

  async function handleClassTeacher(classId: string, teacherId: string) {
    try {
      await fetch("/api/class-teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, teacherId }),
      });
      const res = await fetch("/api/assignments");
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
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
      const res = await fetch("/api/assignments");
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch {
      alert("Failed.");
    }
  }

  async function deleteAssignment(classId: string, subjectId: string) {
    try {
      await fetch(`/api/assignments?classId=${classId}&subjectId=${subjectId}`, { method: "DELETE" });
      setAssignments((prev) => prev.filter((a) => a.classId !== classId || a.subjectId !== subjectId));
      if (editingKey && editingKey.classId === classId && editingKey.subjectId === subjectId) {
        setEditingKey(null);
        setForm({ classId: "", subjectId: "", teacherId: "" });
      }
    } catch {
      alert("Failed.");
    }
  }

  const [classTeacherMap, setClassTeacherMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/class-teacher")
      .then((r) => r.json())
      .then((list) => {
        const m: Record<string, string> = {};
        if (Array.isArray(list)) list.forEach((ct: { classId: string; teacherId: string }) => (m[ct.classId] = ct.teacherId));
        setClassTeacherMap(m);
      });
  }, []);

  const [gradeModes, setGradeModes] = useState<Record<string, string>>({});
  useEffect(() => {
    fetch("/api/grade-modes")
      .then((r) => r.json())
      .then((list) => {
        const m: Record<string, string> = {};
        if (Array.isArray(list)) list.forEach((gm: { gradeId: string; mode: string }) => (m[gm.gradeId] = gm.mode));
        setGradeModes(m);
      });
  }, []);

  async function setGradeMode(gradeId: string, mode: string) {
    try {
      await fetch("/api/grade-modes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradeId, mode }),
      });
      setGradeModes((prev) => ({ ...prev, [gradeId]: mode }));
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
