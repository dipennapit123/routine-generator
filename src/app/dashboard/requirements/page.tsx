"use client";

import { useEffect, useState } from "react";

interface Subject {
  id: string;
  name: string;
}
interface Grade {
  id: string;
  number: number | null;
  label: string;
}
interface ClassRoom {
  id: string;
  displayName: string;
}
interface Requirement {
  id: string;
  gradeId: string | null;
  classId: string | null;
  subjectId: string;
  periodsPerWeek: number;
  allowDoublePeriod: boolean;
  maxPerDay: number | null;
  avoidConsecutive: boolean;
  subject?: Subject;
  grade?: Grade;
  classRoom?: ClassRoom;
}

export default function RequirementsPage() {
  const [list, setList] = useState<Requirement[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Requirement | null>(null);
  const [form, setForm] = useState({
    gradeId: "",
    classId: "",
    subjectId: "",
    periodsPerWeek: 5,
    allowDoublePeriod: false,
    maxPerDay: 2,
    avoidConsecutive: false,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/requirements").then((r) => r.json()),
      fetch("/api/subjects").then((r) => r.json()),
      fetch("/api/grades").then((r) => r.json()),
      fetch("/api/classes").then((r) => r.json()),
    ]).then(([req, sub, g, c]) => {
      setList(Array.isArray(req) ? req : []);
      setSubjects(Array.isArray(sub) ? sub : []);
      setGrades(Array.isArray(g) ? g : []);
      setClasses(Array.isArray(c) ? c : []);
      setLoading(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing && (!form.subjectId || (!form.gradeId && !form.classId))) {
      alert("Set either grade or class, and subject.");
      return;
    }
    try {
      if (editing) {
        await fetch(`/api/requirements/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            periodsPerWeek: form.periodsPerWeek,
            allowDoublePeriod: form.allowDoublePeriod,
            maxPerDay: form.maxPerDay,
            avoidConsecutive: form.avoidConsecutive,
          }),
        });
      } else {
        await fetch("/api/requirements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gradeId: form.gradeId || null,
            classId: form.classId || null,
            subjectId: form.subjectId,
            periodsPerWeek: form.periodsPerWeek,
            allowDoublePeriod: form.allowDoublePeriod,
            maxPerDay: form.maxPerDay,
            avoidConsecutive: form.avoidConsecutive,
          }),
        });
      }
      setEditing(null);
      setForm({
        gradeId: "",
        classId: "",
        subjectId: "",
        periodsPerWeek: 5,
        allowDoublePeriod: false,
        maxPerDay: 2,
        avoidConsecutive: false,
      });
      const res = await fetch("/api/requirements");
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch {
      alert("Failed.");
    }
  }

  async function deleteReq(id: string) {
    try {
      await fetch(`/api/requirements/${id}`, { method: "DELETE" });
      setList((prev) => prev.filter((r) => r.id !== id));
      if (editing?.id === id) {
        setEditing(null);
        setForm({
          gradeId: "",
          classId: "",
          subjectId: "",
          periodsPerWeek: 5,
          allowDoublePeriod: false,
          maxPerDay: 2,
          avoidConsecutive: false,
        });
      }
    } catch {
      alert("Failed.");
    }
  }

  if (loading) return <p className="loading-text">Loading...</p>;

  return (
    <div>
      <h1 className="page-title mb-8">Subject Requirements</h1>
      <p className="mb-4 text-sm text-slate-600">Define how many periods per week each subject needs (per grade or per class).</p>
      <form onSubmit={handleSubmit} className="card mb-6 flex flex-wrap gap-2 p-4">
        {editing && (
          <p className="w-full mb-2 text-xs text-[var(--text-muted)]">
            Editing requirement for{" "}
            <strong>
              {editing.classRoom?.displayName ?? (editing.grade?.label ?? "—")} – {editing.subject?.name}
            </strong>
            . Grade/Class/Subject cannot be changed here; adjust numbers and flags, or delete and add a new row.
          </p>
        )}
        <select
          value={form.gradeId}
          onChange={(e) => setForm((f) => ({ ...f, gradeId: e.target.value, classId: "" }))}
          disabled={!!editing}
          className="rounded border border-slate-300 px-3 py-2"
        >
          <option value="">Grade (all sections)</option>
          {grades.map((g) => {
            const label = g.label ?? (g.number != null ? `Grade ${g.number}` : "Grade");
            return (
              <option key={g.id} value={g.id}>
                {label}
              </option>
            );
          })}
        </select>
        <select
          value={form.classId}
          onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value, gradeId: "" }))}
          disabled={!!editing}
          className="rounded border border-slate-300 px-3 py-2"
        >
          <option value="">Or specific class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.displayName}
            </option>
          ))}
        </select>
        <select
          value={form.subjectId}
          onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
          disabled={!!editing}
          className="rounded border border-slate-300 px-3 py-2"
        >
          <option value="">Subject</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          max={20}
          value={form.periodsPerWeek}
          onChange={(e) => setForm((f) => ({ ...f, periodsPerWeek: Number(e.target.value) }))}
          className="w-20 rounded border border-slate-300 px-2 py-2"
          placeholder="Periods/week"
        />
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={form.allowDoublePeriod}
            onChange={(e) => setForm((f) => ({ ...f, allowDoublePeriod: e.target.checked }))}
          />
          Double OK
        </label>
        <input
          type="number"
          min={1}
          max={6}
          value={form.maxPerDay}
          onChange={(e) => setForm((f) => ({ ...f, maxPerDay: Number(e.target.value) }))}
          className="w-20 rounded border border-slate-300 px-2 py-2"
          placeholder="Max/day"
        />
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={form.avoidConsecutive}
            onChange={(e) => setForm((f) => ({ ...f, avoidConsecutive: e.target.checked }))}
          />
          Avoid consecutive
        </label>
        <button type="submit" className="btn-primary">
          {editing ? "Save changes" : "Add"}
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setForm({
                gradeId: "",
                classId: "",
                subjectId: "",
                periodsPerWeek: 5,
                allowDoublePeriod: false,
                maxPerDay: 2,
                avoidConsecutive: false,
              });
            }}
            className="btn-secondary"
          >
            Cancel edit
          </button>
        )}
      </form>
      <div className="table-wrapper">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th>Grade/Class</th>
            <th>Subject</th>
            <th>Periods/week</th>
            <th>Double</th>
            <th>Max/day</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.id}>
              <td>
                {r.classRoom?.displayName ??
                  (r.grade
                    ? r.grade.label ?? (r.grade.number != null ? `Grade ${r.grade.number}` : "—")
                    : "—")}
              </td>
              <td>{r.subject?.name ?? r.subjectId}</td>
              <td>{r.periodsPerWeek}</td>
              <td>{r.allowDoublePeriod ? "Yes" : "No"}</td>
              <td>{r.maxPerDay ?? "—"}</td>
              <td>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(r);
                    setForm({
                      gradeId: r.gradeId ?? "",
                      classId: r.classId ?? "",
                      subjectId: r.subjectId,
                      periodsPerWeek: r.periodsPerWeek,
                      allowDoublePeriod: r.allowDoublePeriod,
                      maxPerDay: r.maxPerDay ?? 2,
                      avoidConsecutive: r.avoidConsecutive,
                    });
                  }}
                  className="text-indigo-600 hover:underline mr-2"
                >
                  Edit
                </button>
                <button type="button" onClick={() => deleteReq(r.id)} className="text-red-600 hover:underline">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
