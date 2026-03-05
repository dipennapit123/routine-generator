"use client";

import { useEffect, useState } from "react";

type SubTab = "grades" | "sections" | "classes";

interface Grade {
  id: string;
  number: number | null;
  label: string;
  sections: { id: string; name: string; gradeId: string }[];
}

interface SectionWithGrade {
  id: string;
  name: string;
  gradeId: string;
  grade: { id: string; number: number | null; label: string };
}

interface ClassRoom {
  id: string;
  displayName: string;
  grade: { number: number | null; label: string };
  section: { name: string };
}

export default function GradesClassesPage() {
  const [activeTab, setActiveTab] = useState<SubTab>("grades");
  const [grades, setGrades] = useState<Grade[]>([]);
  const [sections, setSections] = useState<SectionWithGrade[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const [newGrade, setNewGrade] = useState("");
  const [newNamedGrade, setNewNamedGrade] = useState("");
  const [newSection, setNewSection] = useState({ gradeId: "", name: "" });
  const [newClass, setNewClass] = useState({ gradeId: "", sectionId: "" });
  const [classSearch, setClassSearch] = useState("");

  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [editNumber, setEditNumber] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editClassName, setEditClassName] = useState("");

  function load() {
    Promise.all([
      fetch("/api/grades").then((r) => r.json()),
      fetch("/api/sections").then((r) => r.json()),
      fetch("/api/classes").then((r) => r.json()),
    ]).then(([g, s, c]) => {
      setGrades(Array.isArray(g) ? g : []);
      setSections(Array.isArray(s) ? s : []);
      setClasses(Array.isArray(c) ? c : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function addGrade(e: React.FormEvent) {
    e.preventDefault();
    const num = parseInt(newGrade, 10);
    if (isNaN(num) || num < 1 || num > 12) {
      alert("Enter grade 1–12");
      return;
    }
    try {
      const res = await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: num, label: `Grade ${num}` }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 409) {
          alert(data?.error ?? "A grade with this label or number already exists.");
        } else {
          alert(data?.error ?? "Failed to create grade.");
        }
        return;
      }
      setNewGrade("");
      load();
    } catch {
      alert("Failed.");
    }
  }

  async function addNamedGrade(e: React.FormEvent) {
    e.preventDefault();
    if (!newNamedGrade.trim()) {
      alert("Enter grade name (e.g. Nursery, LKG, Bachelor)");
      return;
    }
    try {
      const res = await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newNamedGrade.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 409) {
          alert(data?.error ?? "A grade with this label or number already exists.");
        } else {
          alert(data?.error ?? "Failed to create grade.");
        }
        return;
      }
      setNewNamedGrade("");
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

  const filteredClasses = classes
    .filter((c) =>
      classSearch ? c.displayName.toLowerCase().includes(classSearch.toLowerCase()) : true
    )
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  if (loading) return <p className="loading-text">Loading...</p>;

  const subTabs: { id: SubTab; label: string }[] = [
    { id: "grades", label: "Grades" },
    { id: "sections", label: "Sections" },
    { id: "classes", label: "Classes" },
  ];

  return (
    <div>
      <h1 className="page-title mb-6">Grades & Classes</h1>

      {/* Sub-option menu */}
      <nav
        className="mb-6 flex gap-1 rounded-lg bg-[var(--bg-sidebar)]/60 p-1"
        style={{ width: "fit-content" }}
      >
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-[var(--bg-sidebar-active)] text-[var(--text-sidebar-active)]"
                : "text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Grades section */}
      {activeTab === "grades" && (
        <section>
          <h2 className="mb-4 font-semibold text-slate-800">Grades (1–12 and named levels)</h2>
          <div className="mb-4 flex flex-wrap gap-4">
            <form onSubmit={addGrade} className="flex gap-2">
              <input
                type="number"
                min={1}
                max={12}
                placeholder="Grade (1–12)"
                value={newGrade}
                onChange={(e) => setNewGrade(e.target.value)}
                className="w-24 rounded border border-slate-300 px-3 py-2"
              />
              <button type="submit" className="btn-primary">Add Grade</button>
            </form>
            <form onSubmit={addNamedGrade} className="flex gap-2">
              <input
                type="text"
                placeholder="Named grade (e.g. Nursery, Bachelor)"
                value={newNamedGrade}
                onChange={(e) => setNewNamedGrade(e.target.value)}
                className="w-64 rounded border border-slate-300 px-3 py-2"
              />
              <button type="submit" className="btn-secondary">Add Named Grade</button>
            </form>
          </div>
          <div className="mb-2 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="mr-2 font-medium">Quick add:</span>
            {["Nursery", "LKG / JKG", "UKG / SKG", "Bachelor (4 years)", "Master (4 semesters)"].map(
              (label) => (
                <button
                  key={label}
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/grades", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ label }),
                      });
                      if (!res.ok) {
                        const data = await res.json().catch(() => null);
                        if (res.status === 409) {
                          alert(data?.error ?? "A grade with this label or number already exists.");
                        } else {
                          alert(data?.error ?? "Failed to create grade.");
                        }
                        return;
                      }
                      load();
                    } catch {
                      alert("Failed to add grade.");
                    }
                  }}
                  className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50"
                >
                  {label}
                </button>
              )
            )}
          </div>
          {editingGrade && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editLabel.trim()) {
                  alert("Label is required.");
                  return;
                }
                try {
                  await fetch(`/api/grades/${editingGrade.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      number: editNumber ? Number(editNumber) : null,
                      label: editLabel.trim(),
                    }),
                  });
                  setEditingGrade(null);
                  setEditNumber("");
                  setEditLabel("");
                  load();
                } catch {
                  alert("Failed to update grade.");
                }
              }}
              className="mb-4 flex flex-wrap items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-xs"
            >
              <span className="mr-2 font-semibold">Edit grade:</span>
              <input
                type="number"
                min={1}
                max={12}
                placeholder="Number (optional)"
                value={editNumber}
                onChange={(e) => setEditNumber(e.target.value)}
                className="w-24 rounded border border-slate-300 px-2 py-1"
              />
              <input
                type="text"
                placeholder="Label"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="w-64 rounded border border-slate-300 px-2 py-1"
              />
              <button type="submit" className="btn-primary text-xs">Save</button>
              <button
                type="button"
                onClick={() => {
                  setEditingGrade(null);
                  setEditNumber("");
                  setEditLabel("");
                }}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
            </form>
          )}
          <div className="table-wrapper">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Number</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g) => (
                  <tr key={g.id}>
                    <td className="font-medium">{g.label}</td>
                    <td>{g.number != null ? g.number : "—"}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGrade(g);
                          setEditNumber(g.number != null ? String(g.number) : "");
                          setEditLabel(g.label);
                        }}
                        className="text-indigo-600 hover:underline mr-3 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteGrade(g.id)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Sections section */}
      {activeTab === "sections" && (
        <section>
          <h2 className="mb-4 font-semibold text-slate-800">Sections</h2>
          <form onSubmit={addSection} className="mb-4 flex gap-2">
            <select
              value={newSection.gradeId}
              onChange={(e) => setNewSection((s) => ({ ...s, gradeId: e.target.value }))}
              className="rounded border border-slate-300 px-3 py-2"
            >
              <option value="">Select grade</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
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
          <div className="table-wrapper">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th>Grade</th>
                  <th>Section name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((s) => (
                  <tr key={s.id}>
                    <td className="font-medium">{s.grade?.label ?? "—"}</td>
                    <td>{s.name}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => deleteSection(s.id)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Classes section */}
      {activeTab === "classes" && (
        <section>
          <h2 className="mb-4 font-semibold text-slate-800">Classes (Grade + Section)</h2>
          <div className="mb-2 flex items-center gap-2">
            <input
              type="text"
              placeholder="Search classes by name..."
              value={classSearch}
              onChange={(e) => setClassSearch(e.target.value)}
              className="max-w-xs flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <form onSubmit={addClass} className="mb-4 flex gap-2">
            <select
              value={newClass.gradeId}
              onChange={(e) => setNewClass((c) => ({ ...c, gradeId: e.target.value, sectionId: "" }))}
              className="rounded border border-slate-300 px-3 py-2"
            >
              <option value="">Select grade</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
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
                  <th>Grade</th>
                  <th>Section</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">
                      {editingClassId === c.id ? (
                        <input
                          type="text"
                          value={editClassName}
                          onChange={(e) => setEditClassName(e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        c.displayName
                      )}
                    </td>
                    <td>{c.grade?.label ?? "—"}</td>
                    <td>{c.section?.name ?? "—"}</td>
                    <td>
                      {editingClassId === c.id ? (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!editClassName.trim()) {
                                alert("Class name is required.");
                                return;
                              }
                              try {
                                await fetch(`/api/classes/${c.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ displayName: editClassName.trim() }),
                                });
                                setEditingClassId(null);
                                setEditClassName("");
                                load();
                              } catch {
                                alert("Failed to update class.");
                              }
                            }}
                            className="mr-2 text-sm text-indigo-600 hover:underline"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingClassId(null);
                              setEditClassName("");
                            }}
                            className="text-sm text-slate-600 hover:underline"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingClassId(c.id);
                              setEditClassName(c.displayName);
                            }}
                            className="mr-3 text-sm text-indigo-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteClass(c.id)}
                            className="text-sm text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
