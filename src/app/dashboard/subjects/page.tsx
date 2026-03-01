"use client";

import { useEffect, useState } from "react";

interface Subject {
  id: string;
  name: string;
  type: string;
  requiresResource: boolean;
  resourceType: string | null;
}

export default function SubjectsPage() {
  const [list, setList] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Subject | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "THEORY" as "THEORY" | "PRACTICAL" | "ECA",
    requiresResource: false,
    resourceType: null as string | null,
  });

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((data) => {
        setList(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function openAdd() {
    setForm({ name: "", type: "THEORY", requiresResource: false, resourceType: null });
    setModal({ id: "", name: "", type: "THEORY", requiresResource: false, resourceType: null });
  }

  function openEdit(s: Subject) {
    setForm({
      name: s.name,
      type: s.type as "THEORY" | "PRACTICAL" | "ECA",
      requiresResource: s.requiresResource,
      resourceType: s.resourceType,
    });
    setModal(s);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (form.requiresResource && !form.resourceType) {
      alert("Select resource type when subject requires resource.");
      return;
    }
    try {
      if (modal?.id) {
        await fetch(`/api/subjects/${modal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch("/api/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setModal(null);
      const res = await fetch("/api/subjects");
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch {
      alert("Failed.");
    }
  }

  async function deleteSubject(id: string) {
    if (!confirm("Delete?")) return;
    try {
      await fetch(`/api/subjects/${id}`, { method: "DELETE" });
      setList((prev) => prev.filter((s) => s.id !== id));
    } catch {
      alert("Failed.");
    }
  }

  if (loading) return <p className="loading-text">Loading...</p>;

  return (
    <div>
      <h1 className="page-title mb-8">Subjects</h1>
      <button
        type="button"
        onClick={openAdd}
        className="btn-primary mb-6"
      >
        Add Subject
      </button>
      <div className="table-wrapper">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Requires resource</th>
            <th>Resource type</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map((s) => (
            <tr key={s.id}>
              <td className="font-medium">{s.name}</td>
              <td>{s.type}</td>
              <td>{s.requiresResource ? "Yes" : "No"}</td>
              <td>{s.resourceType ?? "—"}</td>
              <td>
                <button type="button" onClick={() => openEdit(s)} className="text-indigo-600 hover:underline mr-2">
                  Edit
                </button>
                <button type="button" onClick={() => deleteSubject(s.id)} className="text-red-600 hover:underline">
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
            <h3 className="mb-5 text-lg font-semibold text-[var(--text-primary)]">{modal.id ? "Edit" : "Add"} Subject</h3>
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
                  <option value="THEORY">THEORY</option>
                  <option value="PRACTICAL">PRACTICAL</option>
                  <option value="ECA">ECA</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="reqRes"
                  checked={form.requiresResource}
                  onChange={(e) => setForm((f) => ({ ...f, requiresResource: e.target.checked }))}
                  className="h-4 w-4"
                />
                <label htmlFor="reqRes">Requires resource</label>
              </div>
              {form.requiresResource && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">Resource type</label>
                  <select
                    value={form.resourceType ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, resourceType: e.target.value || null }))}
                    className="input mt-1.5"
                  >
                    <option value="">Select</option>
                    <option value="SCIENCE_LAB">SCIENCE_LAB</option>
                    <option value="COMPUTER_LAB">COMPUTER_LAB</option>
                    <option value="LIBRARY">LIBRARY</option>
                    <option value="ECA_ROOM">ECA_ROOM</option>
                  </select>
                </div>
              )}
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
