"use client";

import { useEffect, useState } from "react";

interface Teacher {
  id: string;
  name: string;
  type: string;
  maxPerWeek: number;
  maxPerDay: number;
}

export default function TeachersPage() {
  const [list, setList] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Teacher | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "FULL_TIME" as "FULL_TIME" | "PART_TIME",
    maxPerWeek: 30,
    maxPerDay: 6,
  });

  useEffect(() => {
    fetch("/api/teachers")
      .then((r) => r.json())
      .then((data) => {
        setList(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function openAdd() {
    setForm({ name: "", type: "FULL_TIME", maxPerWeek: 30, maxPerDay: 6 });
    setModal({ id: "", name: "", type: "FULL_TIME", maxPerWeek: 30, maxPerDay: 6 });
  }

  function openEdit(t: Teacher) {
    setForm({
      name: t.name,
      type: t.type as "FULL_TIME" | "PART_TIME",
      maxPerWeek: t.maxPerWeek,
      maxPerDay: t.maxPerDay,
    });
    setModal(t);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      if (modal?.id) {
        await fetch(`/api/teachers/${modal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch("/api/teachers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setModal(null);
      const res = await fetch("/api/teachers");
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
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
