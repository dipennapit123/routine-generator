"use client";

import { useEffect, useState } from "react";

interface Grade {
  id: string;
  number: number;
  sections: { id: string; name: string; gradeId: string }[];
}

interface ClassRoom {
  id: string;
  displayName: string;
  grade: { number: number };
  section: { name: string };
}

export default function GradesClassesPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGrade, setNewGrade] = useState("");
  const [newSection, setNewSection] = useState({ gradeId: "", name: "" });
  const [newClass, setNewClass] = useState({ gradeId: "", sectionId: "" });

  function load() {
    Promise.all([fetch("/api/grades").then((r) => r.json()), fetch("/api/classes").then((r) => r.json())]).then(
      ([g, c]) => {
        setGrades(Array.isArray(g) ? g : []);
        setClasses(Array.isArray(c) ? c : []);
        setLoading(false);
      }
    ).catch(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function addGrade(e: React.FormEvent) {
    e.preventDefault();
    const num = parseInt(newGrade, 10);
    if (isNaN(num) || num < 1 || num > 10) {
      alert("Enter grade 1–10");
      return;
    }
    try {
      await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: num }),
      });
      setNewGrade("");
      load();
    } catch {
      alert("Failed.");
    }
  }

  async function addSection(e: React.FormEvent) {
    e.preventDefault();
    if (!newSection.gradeId || !newSection.name.trim()) {
      alert("Select grade and section name");
      return;
    }
    try {
      await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradeId: newSection.gradeId, name: newSection.name.trim() }),
      });
      setNewSection({ gradeId: "", name: "" });
      load();
    } catch {
      alert("Failed.");
    }
  }

  async function addClass(e: React.FormEvent) {
    e.preventDefault();
    if (!newClass.gradeId || !newClass.sectionId) {
      alert("Select grade and section");
      return;
    }
    try {
      await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClass),
      });
      setNewClass({ gradeId: "", sectionId: "" });
      load();
    } catch {
      alert("Failed.");
    }
  }

  async function deleteGrade(id: string) {
    if (!confirm("Delete grade and all sections/classes?")) return;
    try {
      await fetch(`/api/grades/${id}`, { method: "DELETE" });
      load();
    } catch {
      alert("Failed.");
    }
  }

  async function deleteSection(id: string) {
    try {
      await fetch(`/api/sections/${id}`, { method: "DELETE" });
      load();
    } catch {
      alert("Failed.");
    }
  }

  async function deleteClass(id: string) {
    try {
      await fetch(`/api/classes/${id}`, { method: "DELETE" });
      load();
    } catch {
      alert("Failed.");
    }
  }

  if (loading) return <p className="loading-text">Loading...</p>;

  return (
    <div>
      <h1 className="page-title mb-8">Grades & Classes</h1>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold text-slate-800">Grades (1–10)</h2>
        <form onSubmit={addGrade} className="mb-2 flex gap-2">
          <input
            type="number"
            min={1}
            max={10}
            placeholder="Grade number"
            value={newGrade}
            onChange={(e) => setNewGrade(e.target.value)}
            className="w-24 rounded border border-slate-300 px-3 py-2"
          />
          <button type="submit" className="btn-primary">Add Grade</button>
        </form>
        <ul className="flex flex-wrap gap-2">
          {grades.map((g) => (
            <li key={g.id} className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1">
              Grade {g.number}
              <button type="button" onClick={() => deleteGrade(g.id)} className="text-red-600 hover:underline">
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold text-slate-800">Sections</h2>
        <form onSubmit={addSection} className="mb-2 flex gap-2">
          <select
            value={newSection.gradeId}
            onChange={(e) => setNewSection((s) => ({ ...s, gradeId: e.target.value }))}
            className="rounded border border-slate-300 px-3 py-2"
          >
            <option value="">Select grade</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                Grade {g.number}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Section (e.g. A)"
            value={newSection.name}
            onChange={(e) => setNewSection((s) => ({ ...s, name: e.target.value }))}
            className="w-32 rounded border border-slate-300 px-3 py-2"
          />
          <button type="submit" className="btn-primary">Add Section</button>
        </form>
        <div className="space-y-2">
          {grades.map((g) => (
            <div key={g.id}>
              <span className="font-medium">Grade {g.number}:</span>{" "}
              {g.sections?.map((s) => (
                <span key={s.id} className="mr-2 inline-flex items-center rounded bg-slate-100 px-2 py-0.5">
                  {s.name}
                  <button type="button" onClick={() => deleteSection(s.id)} className="ml-1 text-red-600 hover:underline">
                    ×
                  </button>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-slate-800">Classes (Grade + Section)</h2>
        <form onSubmit={addClass} className="mb-2 flex gap-2">
          <select
            value={newClass.gradeId}
            onChange={(e) => setNewClass((c) => ({ ...c, gradeId: e.target.value, sectionId: "" }))}
            className="rounded border border-slate-300 px-3 py-2"
          >
            <option value="">Select grade</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                Grade {g.number}
              </option>
            ))}
          </select>
          <select
            value={newClass.sectionId}
            onChange={(e) => setNewClass((c) => ({ ...c, sectionId: e.target.value }))}
            className="rounded border border-slate-300 px-3 py-2"
          >
            <option value="">Select section</option>
            {grades.find((g) => g.id === newClass.gradeId)?.sections?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary">Create Class</button>
        </form>
        <div className="table-wrapper">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th>Class</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id}>
                <td className="font-medium">{c.displayName}</td>
                <td>
                  <button type="button" onClick={() => deleteClass(c.id)} className="text-red-600 hover:underline">
                    Delete
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
