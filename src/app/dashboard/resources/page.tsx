"use client";

import { useEffect, useState } from "react";

interface Resource {
  id: string;
  name: string;
  type: string;
  capacity: number;
}

export default function ResourcesPage() {
  const [list, setList] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", type: "SCIENCE_LAB" as string, capacity: 1 });

  useEffect(() => {
    fetch("/api/resources")
      .then((r) => r.json())
      .then((data) => {
        setList(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm({ name: "", type: "SCIENCE_LAB", capacity: 1 });
      const res = await fetch("/api/resources");
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch {
      alert("Failed.");
    }
  }

  async function deleteResource(id: string) {
    if (!confirm("Delete?")) return;
    try {
      await fetch(`/api/resources/${id}`, { method: "DELETE" });
      setList((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert("Failed.");
    }
  }

  if (loading) return <p className="loading-text">Loading...</p>;

  return (
    <div>
      <h1 className="page-title mb-8">Resources</h1>
      <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="rounded border border-slate-300 px-3 py-2"
        />
        <input
          type="text"
          list="resource-types"
          placeholder="Type (e.g. SCIENCE_LAB, SPORTS_GROUND)"
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          className="rounded border border-slate-300 px-3 py-2"
        />
        <datalist id="resource-types">
          {Array.from(
            new Set([
              ...list.map((r) => r.type),
              "SCIENCE_LAB",
              "COMPUTER_LAB",
              "LIBRARY",
              "ECA_ROOM",
            ])
          ).map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <input
          type="number"
          min={1}
          value={form.capacity}
          onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
          className="w-20 rounded border border-slate-300 px-3 py-2"
        />
        <button type="submit" className="btn-primary">Add Resource</button>
      </form>
      <div className="table-wrapper">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Capacity</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.id}>
              <td className="font-medium">{r.name}</td>
              <td>{r.type}</td>
              <td>{r.capacity}</td>
              <td>
                <button type="button" onClick={() => deleteResource(r.id)} className="text-red-600 hover:underline">
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
