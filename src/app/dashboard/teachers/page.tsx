"use client";

import { useEffect, useState } from "react";

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
}

interface ClassTeacherEntry {
  classId: string;
  teacherId: string;
}

export default function TeachersPage() {
  const [list, setList] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [classTeacherList, setClassTeacherList] = useState<ClassTeacherEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Teacher | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "FULL_TIME" as "FULL_TIME" | "PART_TIME",
    maxPerWeek: 30,
    maxPerDay: 6,
    classTeacherFor: [] as string[],
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/teachers").then((r) => r.json()),
      fetch("/api/classes").then((r) => r.json()),
      fetch("/api/class-teacher").then((r) => r.json()),
    ]).then(([teachersData, classesData, ctData]) => {
      setList(Array.isArray(teachersData) ? teachersData : []);
      setClasses(Array.isArray(classesData) ? classesData : []);
      setClassTeacherList(Array.isArray(ctData) ? ctData : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function openAdd() {
    setForm({ name: "", type: "FULL_TIME", maxPerWeek: 30, maxPerDay: 6, classTeacherFor: [] });
    setModal({ id: "", name: "", type: "FULL_TIME", maxPerWeek: 30, maxPerDay: 6 });
  }

  function openEdit(t: Teacher) {
    const classTeacherFor = classTeacherList
      .filter((ct) => ct.teacherId === t.id)
      .map((ct) => ct.classId);
    setForm({
      name: t.name,
      type: t.type as "FULL_TIME" | "PART_TIME",
      maxPerWeek: t.maxPerWeek,
      maxPerDay: t.maxPerDay,
      classTeacherFor,
    });
    setModal(t);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
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
      } else {
        const res = await fetch("/api/teachers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(teacherPayload),
        });
        const created = await res.json();
        teacherId = created?.id;
        if (teacherId && form.classTeacherFor.length > 0) {
          for (const classId of form.classTeacherFor) {
            await fetch("/api/class-teacher", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ classId, teacherId }),
            });
          }
        }
      }
      setModal(null);
      const [teachersRes, ctRes] = await Promise.all([
        fetch("/api/teachers"),
        fetch("/api/class-teacher"),
      ]);
      setList(Array.isArray(await teachersRes.json()) ? await teachersRes.json() : []);
      setClassTeacherList(Array.isArray(await ctRes.json()) ? await ctRes.json() : []);
    } catch {
      alert("Failed.");
    }
  }

  async function deleteTeacher(id: string) {
    if (!confirm("Delete?")) return;
    try {
      await fetch(`/api/teachers/${id}`, { method: "DELETE" });
      setList((prev) => prev.filter((t) => t.id !== id));
    } catch {
      alert("Failed.");
    }
  }

  if (loading) return <p className="loading-text">Loading...</p>;

  return (
    <div>
      <h1 className="page-title mb-8">Teachers</h1>
      <button
        type="button"
        onClick={openAdd}
        className="btn-primary mb-6"
      >
        Add Teacher
      </button>
      <div className="table-wrapper">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Max/week</th>
            <th>Max/day</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map((t) => (
            <tr key={t.id}>
              <td className="font-medium">{t.name}</td>
              <td>{t.type}</td>
              <td>{t.maxPerWeek}</td>
              <td>{t.maxPerDay}</td>
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

      {modal && (
        <div className="modal-overlay fixed inset-0 z-10 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="modal-content w-full max-w-md p-6">
            <h3 className="mb-5 text-lg font-semibold text-[var(--text-primary)]">{modal.id ? "Edit" : "Add"} Teacher</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)]">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="input mt-1.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)]">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof form.type }))}
                  className="input mt-1.5"
                >
                  <option value="FULL_TIME">FULL_TIME</option>
                  <option value="PART_TIME">PART_TIME</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)]">Max periods per week</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={form.maxPerWeek}
                  onChange={(e) => setForm((f) => ({ ...f, maxPerWeek: Number(e.target.value) }))}
                  className="input mt-1.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)]">Max periods per day</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={form.maxPerDay}
                  onChange={(e) => setForm((f) => ({ ...f, maxPerDay: Number(e.target.value) }))}
                  className="input mt-1.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Class teacher for (optional)</label>
                <p className="text-xs text-[var(--text-muted)] mb-2">Assign this teacher as class teacher to one or more classes.</p>
                <div className="max-h-32 overflow-y-auto rounded border border-[var(--border)] bg-[var(--bg-secondary)] p-2 space-y-1.5">
                  {classes.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">No classes yet. Add grades &amp; classes first.</p>
                  ) : (
                    classes.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.classTeacherFor.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm((f) => ({ ...f, classTeacherFor: [...f.classTeacherFor, c.id] }));
                            } else {
                              setForm((f) => ({ ...f, classTeacherFor: f.classTeacherFor.filter((id) => id !== c.id) }));
                            }
                          }}
                          className="rounded border-[var(--border)]"
                        />
                        <span className="text-sm">{c.displayName}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button type="submit" className="btn-primary">Save</button>
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
