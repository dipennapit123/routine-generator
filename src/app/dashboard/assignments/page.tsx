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

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [grades, setGrades] = useState<{ id: string; number: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ classId: "", subjectId: "", teacherId: "" });

  useEffect(() => {
    Promise.all([
      fetch("/api/assignments").then((r) => r.json()),
      fetch("/api/classes").then((r) => r.json()),
      fetch("/api/subjects").then((r) => r.json()),
      fetch("/api/teachers").then((r) => r.json()),
      fetch("/api/grades").then((r) => r.json()),
    ]).then(([a, c, s, t, g]) => {
      setAssignments(Array.isArray(a) ? a : []);
      setClasses(Array.isArray(c) ? c : []);
      setSubjects(Array.isArray(s) ? s : []);
      setTeachers(Array.isArray(t) ? t : []);
      setGrades(Array.isArray(g) ? g : []);
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
      setAssignments(Array.isArray(await res.json()) ? await res.json() : []);
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
      const res = await fetch("/api/assignments");
      setAssignments(Array.isArray(await res.json()) ? await res.json() : []);
    } catch {
      alert("Failed.");
    }
  }

  async function deleteAssignment(classId: string, subjectId: string) {
    try {
      await fetch(`/api/assignments?classId=${classId}&subjectId=${subjectId}`, { method: "DELETE" });
      setAssignments((prev) => prev.filter((a) => a.classId !== classId || a.subjectId !== subjectId));
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

  return (
    <div>
      <h1 className="page-title mb-8">Assignments</h1>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold text-slate-800">Grade Mode (Grade System vs Subject System)</h2>
        <p className="mb-2 text-sm text-slate-600">Grade 1–3 often use Grade System (one class teacher for most subjects).</p>
        <div className="flex flex-wrap gap-4">
          {grades.map((g) => (
            <div key={g.id} className="flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2">
              <span className="font-medium">Grade {g.number}</span>
              <select
                value={gradeModes[g.id] ?? "SUBJECT_SYSTEM"}
                onChange={(e) => setGradeMode(g.id, e.target.value)}
                className="rounded border border-slate-300 px-2 py-1 text-sm"
              >
                <option value="GRADE_SYSTEM">Grade System</option>
                <option value="SUBJECT_SYSTEM">Subject System</option>
              </select>
            </div>
          ))}
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
        <form onSubmit={handleSubjectAssignment} className="mb-4 flex flex-wrap gap-2">
          <select
            value={form.classId}
            onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
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
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary">Assign</button>
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
