"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Pagination, TABLE_PAGE_SIZE } from "@/components/Pagination";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/components/Toast";

type SubTab = "grades" | "faculties" | "groups" | "semesters" | "sections" | "classes";

/** Faculty and Group are only for Grade 11, 12, Bachelor, Master. */
function isFacultyEligibleGrade(g: { number: number | null; label: string }): boolean {
  if (g.number === 11 || g.number === 12) return true;
  return /bachelor|master/i.test(g.label);
}

/** Semester is only for Bachelor and Master. */
function isSemesterEligibleGrade(g: { label: string }): boolean {
  return /bachelor|master/i.test(g.label);
}

interface Grade {
  id: string;
  number: number | null;
  label: string;
  faculties?: { id: string; name: string; gradeId: string }[];
  sections?: { id: string; name: string; gradeId: string; facultyId: string; faculty?: { id: string; name: string } }[];
}

interface FacultyWithGrade {
  id: string;
  name: string;
  gradeId: string;
  grade: { id: string; number: number | null; label: string };
}

interface SectionWithGrade {
  id: string;
  name: string;
  gradeId: string;
  semesterId?: string | null;
  facultyId: string | null;
  groupId?: string | null;
  grade: { id: string; number: number | null; label: string };
  semester?: { id: string; number: number } | null;
  faculty?: { id: string; name: string } | null;
  group?: { id: string; name: string } | null;
}

interface SemesterWithGrade {
  id: string;
  gradeId: string;
  number: number;
  grade: { id: string; label: string; number: number | null };
}

interface ClassRoom {
  id: string;
  displayName: string;
  grade: { number: number | null; label: string };
  section: { name: string; faculty?: { name: string } | null; group?: { name: string } | null };
}

const GRADES_KEY = "/api/grades";
const FACULTIES_KEY = "/api/faculties";
const GROUPS_KEY = "/api/groups";
const SEMESTERS_KEY = "/api/semesters";
const SECTIONS_KEY = "/api/sections";
const CLASSES_KEY = "/api/classes";

interface GroupWithFaculty {
  id: string;
  name: string;
  facultyId: string;
  faculty: { id: string; name: string; gradeId: string; grade: { id: string; label: string } };
}

const TAB_IDS: SubTab[] = ["grades", "faculties", "groups", "semesters", "sections", "classes"];
function isValidTab(t: string | null): t is SubTab {
  return t !== null && TAB_IDS.includes(t as SubTab);
}

function GradesClassesPageContent() {
  const { mutate } = useSWRConfig();
  const toast = useToast();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: SubTab = isValidTab(tabParam) ? tabParam : "grades";
  const { data: gradesData, isLoading: gradesLoading } = useSWR<Grade[]>(GRADES_KEY);
  const { data: facultiesData } = useSWR<FacultyWithGrade[]>(FACULTIES_KEY);
  const { data: groupsData } = useSWR<GroupWithFaculty[]>(GROUPS_KEY);
  const { data: semestersData } = useSWR<SemesterWithGrade[]>(SEMESTERS_KEY);
  const { data: sectionsData, isLoading: sectionsLoading } = useSWR<SectionWithGrade[]>(SECTIONS_KEY);
  const { data: classesData, isLoading: classesLoading } = useSWR<ClassRoom[]>(CLASSES_KEY);

  const grades = Array.isArray(gradesData) ? gradesData : [];
  const faculties = Array.isArray(facultiesData) ? facultiesData : [];
  const groups = Array.isArray(groupsData) ? groupsData : [];
  const semesters = Array.isArray(semestersData) ? semestersData : [];
  const sections = Array.isArray(sectionsData) ? sectionsData : [];
  const classes = Array.isArray(classesData) ? classesData : [];
  const loading = gradesLoading || sectionsLoading || classesLoading;

  const facultyEligibleGrades = useMemo(
    () => grades.filter((g) => isFacultyEligibleGrade(g)),
    [grades]
  );
  const semesterEligibleGrades = useMemo(
    () => grades.filter((g) => isSemesterEligibleGrade(g)),
    [grades]
  );

  const [newGrade, setNewGrade] = useState("");
  const [newNamedGrade, setNewNamedGrade] = useState("");
  const [newFaculty, setNewFaculty] = useState({ gradeId: "", name: "" });
  const [newGroup, setNewGroup] = useState({ facultyId: "", name: "" });
  const [newSection, setNewSection] = useState({ gradeId: "", semesterId: "", facultyId: "", groupId: "", name: "" });
  const [newClass, setNewClass] = useState({ gradeId: "", semesterId: "", facultyId: "", groupId: "", sectionId: "" });
  const [newSemester, setNewSemester] = useState({ gradeId: "", number: 1 });
  const [classSearch, setClassSearch] = useState("");

  const [addGradeLoading, setAddGradeLoading] = useState(false);
  const [addNamedGradeLoading, setAddNamedGradeLoading] = useState(false);
  const [addFacultyLoading, setAddFacultyLoading] = useState(false);
  const [addGroupLoading, setAddGroupLoading] = useState(false);
  const [addSemesterLoading, setAddSemesterLoading] = useState(false);
  const [addSectionLoading, setAddSectionLoading] = useState(false);
  const [addClassLoading, setAddClassLoading] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [editNumber, setEditNumber] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editClassName, setEditClassName] = useState("");
  const [tablePage, setTablePage] = useState<Record<SubTab, number>>({
    grades: 1,
    faculties: 1,
    groups: 1,
    semesters: 1,
    sections: 1,
    classes: 1,
  });

  function revalidate() {
    void mutate(GRADES_KEY);
    void mutate(FACULTIES_KEY);
    void mutate(GROUPS_KEY);
    void mutate(SEMESTERS_KEY);
    void mutate(SECTIONS_KEY);
    void mutate(CLASSES_KEY);
  }

  async function addGrade(e: React.FormEvent) {
    e.preventDefault();
    const num = parseInt(newGrade, 10);
    if (isNaN(num) || num < 1 || num > 12) {
      alert("Enter grade 1–12");
      return;
    }
    setAddGradeLoading(true);
    try {
      const res = await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: num, label: `Grade ${num}` }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 409) {
          toast.error(data?.error ?? "A grade with this label or number already exists.");
        } else {
          toast.error(data?.error ?? "Failed to create grade.");
        }
        return;
      }
      setNewGrade("");
      revalidate();
      toast.success("Grade added");
    } catch {
      toast.error("Failed to add grade.");
    } finally {
      setAddGradeLoading(false);
    }
  }

  async function addNamedGrade(e: React.FormEvent) {
    e.preventDefault();
    if (!newNamedGrade.trim()) {
      alert("Enter grade name (e.g. Nursery, LKG, Bachelor)");
      return;
    }
    setAddNamedGradeLoading(true);
    try {
      const res = await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newNamedGrade.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 409) {
          toast.error(data?.error ?? "A grade with this label or number already exists.");
        } else {
          toast.error(data?.error ?? "Failed to create grade.");
        }
        return;
      }
      setNewNamedGrade("");
      revalidate();
      toast.success("Named grade added");
    } catch {
      toast.error("Failed to add grade.");
    } finally {
      setAddNamedGradeLoading(false);
    }
  }

  async function addFaculty(e: React.FormEvent) {
    e.preventDefault();
    if (!newFaculty.gradeId || !newFaculty.name.trim()) {
      alert("Select grade and enter faculty/course name");
      return;
    }
    setAddFacultyLoading(true);
    try {
      const res = await fetch("/api/faculties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradeId: newFaculty.gradeId, name: newFaculty.name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Failed to add faculty.");
        return;
      }
      setNewFaculty({ gradeId: "", name: "" });
      revalidate();
      toast.success("Faculty added");
    } catch {
      toast.error("Failed to add faculty.");
    } finally {
      setAddFacultyLoading(false);
    }
  }

  async function deleteFaculty(id: string) {
    try {
      await fetch(`/api/faculties/${id}`, { method: "DELETE" });
      revalidate();
    } catch {
      alert("Failed.");
    }
  }

  async function addGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroup.facultyId || !newGroup.name.trim()) {
      alert("Select faculty and enter group name (e.g. Physics, Biology)");
      return;
    }
    setAddGroupLoading(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facultyId: newGroup.facultyId, name: newGroup.name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Failed to add group.");
        return;
      }
      setNewGroup({ facultyId: "", name: "" });
      revalidate();
      toast.success("Group added");
    } catch {
      toast.error("Failed to add group.");
    } finally {
      setAddGroupLoading(false);
    }
  }

  async function deleteGroup(id: string) {
    try {
      await fetch(`/api/groups/${id}`, { method: "DELETE" });
      revalidate();
    } catch {
      alert("Failed.");
    }
  }

  async function addSemester(e: React.FormEvent) {
    e.preventDefault();
    if (!newSemester.gradeId) {
      toast.error("Select a grade (Bachelor or Master).");
      return;
    }
    const g = grades.find((x) => x.id === newSemester.gradeId);
    if (!g || !isSemesterEligibleGrade(g)) {
      toast.error("Semesters are only for Bachelor and Master.");
      return;
    }
    setAddSemesterLoading(true);
    try {
      const res = await fetch("/api/semesters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradeId: newSemester.gradeId, number: newSemester.number }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Failed to add semester.");
        return;
      }
      setNewSemester({ gradeId: "", number: 1 });
      revalidate();
      toast.success("Semester added");
    } catch {
      toast.error("Failed to add semester.");
    } finally {
      setAddSemesterLoading(false);
    }
  }

  async function deleteSemester(id: string) {
    try {
      await fetch(`/api/semesters/${id}`, { method: "DELETE" });
      revalidate();
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
    const selectedGrade = grades.find((g) => g.id === newSection.gradeId);
    const needsFaculty = selectedGrade && isFacultyEligibleGrade(selectedGrade);
    const needsSemester = selectedGrade && isSemesterEligibleGrade(selectedGrade);
    if (needsFaculty && !newSection.facultyId) {
      alert("For Grade 11, 12, Bachelor, Master please select a faculty.");
      return;
    }
    if (needsSemester && !newSection.semesterId) {
      alert("For Bachelor and Master please select a semester.");
      return;
    }
    setAddSectionLoading(true);
    try {
      const body: { gradeId: string; name: string; semesterId?: string; facultyId?: string; groupId?: string } = {
        gradeId: newSection.gradeId,
        name: newSection.name.trim(),
      };
      if (needsSemester && newSection.semesterId) body.semesterId = newSection.semesterId;
      if (needsFaculty && newSection.facultyId) {
        body.facultyId = newSection.facultyId;
        if (newSection.groupId) body.groupId = newSection.groupId;
      }
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Failed to add section.");
        return;
      }
      setNewSection({ gradeId: "", semesterId: "", facultyId: "", groupId: "", name: "" });
      revalidate();
      toast.success("Section added");
    } catch {
      toast.error("Failed to add section.");
    } finally {
      setAddSectionLoading(false);
    }
  }

  async function addClass(e: React.FormEvent) {
    e.preventDefault();
    if (!newClass.gradeId || !newClass.sectionId) {
      alert("Select grade and section (and faculty/group if applicable)");
      return;
    }
    setAddClassLoading(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradeId: newClass.gradeId, sectionId: newClass.sectionId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Failed to create class.");
        return;
      }
      setNewClass({ gradeId: "", semesterId: "", facultyId: "", groupId: "", sectionId: "" });
      revalidate();
      toast.success("Class created");
    } catch {
      toast.error("Failed to create class.");
    } finally {
      setAddClassLoading(false);
    }
  }

  async function deleteGrade(id: string) {
    if (!confirm("Delete grade and all sections/classes?")) return;
    try {
      await fetch(`/api/grades/${id}`, { method: "DELETE" });
      revalidate();
    } catch {
      alert("Failed.");
    }
  }

  async function deleteSection(id: string) {
    try {
      await fetch(`/api/sections/${id}`, { method: "DELETE" });
      revalidate();
    } catch {
      alert("Failed.");
    }
  }

  async function deleteClass(id: string) {
    try {
      await fetch(`/api/classes/${id}`, { method: "DELETE" });
      revalidate();
    } catch {
      alert("Failed.");
    }
  }

  const filteredClasses = useMemo(
    () =>
      [...classes]
        .filter((c) =>
          classSearch.trim()
            ? c.displayName.toLowerCase().includes(classSearch.toLowerCase())
            : true
        )
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [classes, classSearch]
  );

  if (loading) return <p className="loading-text">Loading...</p>;

  const subTabs: { id: SubTab; label: string }[] = [
    { id: "grades", label: "Grades" },
    { id: "faculties", label: "Faculties / Courses" },
    { id: "groups", label: "Groups" },
    { id: "semesters", label: "Semesters" },
    { id: "sections", label: "Sections" },
    { id: "classes", label: "Classes" },
  ];

  const facultiesForGrade = (gradeId: string) =>
    faculties.filter((f) => f.gradeId === gradeId);
  const groupsForFaculty = (facultyId: string) =>
    groups.filter((g) => g.facultyId === facultyId);
  const sectionsForClass = (gradeId: string, semesterId: string, facultyId: string, groupId: string) => {
    const selectedGrade = grades.find((g) => g.id === gradeId);
    const isFacultyGrade = selectedGrade && isFacultyEligibleGrade(selectedGrade);
    const isSemesterGrade = selectedGrade && isSemesterEligibleGrade(selectedGrade);
    if (!isFacultyGrade && !isSemesterGrade) {
      return sections.filter((s) => s.gradeId === gradeId);
    }
    if (isSemesterGrade) {
      if (!semesterId) return [];
      const bySem = sections.filter((s) => s.gradeId === gradeId && s.semesterId === semesterId);
      if (!isFacultyGrade || !facultyId) return bySem;
      return bySem.filter(
        (s) => s.facultyId === facultyId && (groupId ? s.groupId === groupId : true)
      );
    }
    if (isFacultyGrade && !facultyId) return [];
    return sections.filter(
      (s) =>
        s.gradeId === gradeId &&
        s.facultyId === facultyId &&
        (groupId ? s.groupId === groupId : true)
    );
  };

  const semestersForGrade = (gradeId: string) =>
    semesters.filter((s) => s.gradeId === gradeId);
  const maxSemesterForGrade = (g: { label: string }): number =>
    /bachelor/i.test(g.label) ? 8 : 4;

  return (
    <div>
      <h1 className="page-title mb-6">Grades & Classes</h1>

      {/* Sub-option menu: visible, aesthetic tabs (aligned with sidebar) */}
      <nav
        className="mb-8 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
        aria-label="Grades & Classes sections"
      >
        {subTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/dashboard/grades-classes?tab=${tab.id}`}
              className={`inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
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
              <button type="submit" disabled={addGradeLoading} className="btn-primary inline-flex items-center gap-2">
                {addGradeLoading ? <Spinner /> : null}
                {addGradeLoading ? "Adding…" : "Add Grade"}
              </button>
            </form>
            <form onSubmit={addNamedGrade} className="flex gap-2">
              <input
                type="text"
                placeholder="Named grade (e.g. Nursery, Bachelor)"
                value={newNamedGrade}
                onChange={(e) => setNewNamedGrade(e.target.value)}
                className="w-64 rounded border border-slate-300 px-3 py-2"
              />
              <button type="submit" disabled={addNamedGradeLoading} className="btn-secondary inline-flex items-center gap-2">
                {addNamedGradeLoading ? <Spinner /> : null}
                {addNamedGradeLoading ? "Adding…" : "Add Named Grade"}
              </button>
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
                      revalidate();
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
                  revalidate();
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
              <button type="submit" className="btn-primary text-xs inline-flex items-center gap-1">Save</button>
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
                {grades
                  .slice((tablePage.grades - 1) * TABLE_PAGE_SIZE, tablePage.grades * TABLE_PAGE_SIZE)
                  .map((g) => (
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
          <Pagination
            totalItems={grades.length}
            currentPage={tablePage.grades}
            pageSize={TABLE_PAGE_SIZE}
            onPageChange={(p) => setTablePage((s) => ({ ...s, grades: p }))}
            label="grades"
          />
        </section>
      )}

      {/* Faculties / Courses section — only for Grade 11, 12, Bachelor, Master */}
      {activeTab === "faculties" && (
        <section>
          <h2 className="mb-4 font-semibold text-slate-800">Faculties / Courses</h2>
          <p className="mb-3 text-sm text-slate-600">
            For <strong>Grade 11, 12, Bachelor, Master</strong> only. Add faculty (e.g. Science, Commerce) or course (e.g. BSc CS, MBA). Other grades do not use faculty.
          </p>
          <form onSubmit={addFaculty} className="mb-4 flex flex-wrap gap-2">
            <select
              value={newFaculty.gradeId}
              onChange={(e) => setNewFaculty((s) => ({ ...s, gradeId: e.target.value }))}
              className="rounded border border-slate-300 px-3 py-2"
            >
              <option value="">Select grade (11, 12, Bachelor, Master)</option>
              {facultyEligibleGrades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Faculty / course (e.g. Science, BSc CS)"
              value={newFaculty.name}
              onChange={(e) => setNewFaculty((s) => ({ ...s, name: e.target.value }))}
              className="w-56 rounded border border-slate-300 px-3 py-2"
            />
            <button type="submit" disabled={addFacultyLoading} className="btn-primary inline-flex items-center gap-2">
                {addFacultyLoading ? <Spinner /> : null}
                {addFacultyLoading ? "Adding…" : "Add Faculty"}
              </button>
          </form>
          <div className="table-wrapper">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th>Grade</th>
                  <th>Faculty / Course</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {faculties
                  .slice((tablePage.faculties - 1) * TABLE_PAGE_SIZE, tablePage.faculties * TABLE_PAGE_SIZE)
                  .map((f) => (
                  <tr key={f.id}>
                    <td className="font-medium">{f.grade?.label ?? "—"}</td>
                    <td>{f.name}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => deleteFaculty(f.id)}
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
          <Pagination
            totalItems={faculties.length}
            currentPage={tablePage.faculties}
            pageSize={TABLE_PAGE_SIZE}
            onPageChange={(p) => setTablePage((s) => ({ ...s, faculties: p }))}
            label="faculties"
          />
        </section>
      )}

      {/* Groups section — only for Grade 11, 12, Bachelor, Master (via faculty) */}
      {activeTab === "groups" && (
        <section>
          <h2 className="mb-4 font-semibold text-slate-800">Groups</h2>
          <p className="mb-3 text-sm text-slate-600">
            For <strong>Grade 11, 12, Bachelor, Master</strong> only. Add groups under a faculty (e.g. under Science: Physics, Biology).
          </p>
          <form onSubmit={addGroup} className="mb-4 flex flex-wrap gap-2">
            <select
              value={newGroup.facultyId}
              onChange={(e) => setNewGroup((s) => ({ ...s, facultyId: e.target.value }))}
              className="rounded border border-slate-300 px-3 py-2"
            >
              <option value="">Select faculty</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.grade?.label ?? ""} — {f.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Group (e.g. Physics, Biology)"
              value={newGroup.name}
              onChange={(e) => setNewGroup((s) => ({ ...s, name: e.target.value }))}
              className="w-48 rounded border border-slate-300 px-3 py-2"
            />
            <button type="submit" disabled={addGroupLoading} className="btn-primary inline-flex items-center gap-2">
                {addGroupLoading ? <Spinner /> : null}
                {addGroupLoading ? "Adding…" : "Add Group"}
              </button>
          </form>
          <div className="table-wrapper">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th>Faculty</th>
                  <th>Group</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups
                  .slice((tablePage.groups - 1) * TABLE_PAGE_SIZE, tablePage.groups * TABLE_PAGE_SIZE)
                  .map((gr) => (
                  <tr key={gr.id}>
                    <td className="font-medium">{gr.faculty?.grade?.label ?? "—"} — {gr.faculty?.name ?? "—"}</td>
                    <td>{gr.name}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => deleteGroup(gr.id)}
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
          <Pagination
            totalItems={groups.length}
            currentPage={tablePage.groups}
            pageSize={TABLE_PAGE_SIZE}
            onPageChange={(p) => setTablePage((s) => ({ ...s, groups: p }))}
            label="groups"
          />
        </section>
      )}

      {/* Semesters section — only for Bachelor and Master */}
      {activeTab === "semesters" && (
        <section>
          <h2 className="mb-4 font-semibold text-slate-800">Semesters</h2>
          <p className="mb-3 text-sm text-slate-600">
            For <strong>Bachelor</strong> (8 semesters) and <strong>Master</strong> (4 semesters) only. Add semesters before creating sections for these grades.
          </p>
          <form onSubmit={addSemester} className="mb-4 flex flex-wrap gap-2">
            <select
              value={newSemester.gradeId}
              onChange={(e) => {
                const g = grades.find((x) => x.id === e.target.value);
                setNewSemester((s) => ({
                  ...s,
                  gradeId: e.target.value,
                  number: g && /bachelor/i.test(g.label) ? 1 : 1,
                }));
              }}
              className="rounded border border-slate-300 px-3 py-2"
            >
              <option value="">Select grade (Bachelor / Master)</option>
              {semesterEligibleGrades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
            {newSemester.gradeId && (
              <select
                value={newSemester.number}
                onChange={(e) => setNewSemester((s) => ({ ...s, number: Number(e.target.value) }))}
                className="rounded border border-slate-300 px-3 py-2"
              >
                {(() => {
                  const g = grades.find((x) => x.id === newSemester.gradeId);
                  const max = g ? maxSemesterForGrade(g) : 8;
                  return Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      Semester {n}
                    </option>
                  ));
                })()}
              </select>
            )}
            <button type="submit" disabled={addSemesterLoading || !newSemester.gradeId} className="btn-primary inline-flex items-center gap-2">
              {addSemesterLoading ? <Spinner /> : null}
              {addSemesterLoading ? "Adding…" : "Add Semester"}
            </button>
          </form>
          <div className="table-wrapper">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th>Grade</th>
                  <th>Semester</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {semesters
                  .slice((tablePage.semesters - 1) * TABLE_PAGE_SIZE, tablePage.semesters * TABLE_PAGE_SIZE)
                  .map((sem) => (
                  <tr key={sem.id}>
                    <td className="font-medium">{sem.grade?.label ?? "—"}</td>
                    <td>Semester {sem.number}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => deleteSemester(sem.id)}
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
          <Pagination
            totalItems={semesters.length}
            currentPage={tablePage.semesters}
            pageSize={TABLE_PAGE_SIZE}
            onPageChange={(p) => setTablePage((s) => ({ ...s, semesters: p }))}
            label="semesters"
          />
        </section>
      )}

      {/* Sections section */}
      {activeTab === "sections" && (
        <section>
          <h2 className="mb-4 font-semibold text-slate-800">Sections</h2>
          <p className="mb-3 text-sm text-slate-600">
            For Bachelor/Master: select Grade → Semester → Faculty → optional Group → Section name. For Grade 11–12: Grade → Faculty → Group → Section. For others: Grade → Section name only.
          </p>
          <form onSubmit={addSection} className="mb-4 flex flex-wrap gap-2">
            <select
              value={newSection.gradeId}
              onChange={(e) =>
                setNewSection((s) => ({ ...s, gradeId: e.target.value, semesterId: "", facultyId: "", groupId: "" }))
              }
              className="rounded border border-slate-300 px-3 py-2"
            >
              <option value="">Select grade</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
            {newSection.gradeId && grades.find((g) => g.id === newSection.gradeId) && isSemesterEligibleGrade(grades.find((g) => g.id === newSection.gradeId)!) && (
              <select
                value={newSection.semesterId}
                onChange={(e) => setNewSection((s) => ({ ...s, semesterId: e.target.value }))}
                className="rounded border border-slate-300 px-3 py-2"
              >
                <option value="">Select semester</option>
                {semestersForGrade(newSection.gradeId).map((sem) => (
                  <option key={sem.id} value={sem.id}>
                    Semester {sem.number}
                  </option>
                ))}
              </select>
            )}
            {newSection.gradeId && grades.find((g) => g.id === newSection.gradeId) && isFacultyEligibleGrade(grades.find((g) => g.id === newSection.gradeId)!) && (
              <>
                <select
                  value={newSection.facultyId}
                  onChange={(e) =>
                    setNewSection((s) => ({ ...s, facultyId: e.target.value, groupId: "" }))
                  }
                  className="rounded border border-slate-300 px-3 py-2"
                >
                  <option value="">Select faculty</option>
                  {facultiesForGrade(newSection.gradeId).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <select
                  value={newSection.groupId}
                  onChange={(e) => setNewSection((s) => ({ ...s, groupId: e.target.value }))}
                  className="rounded border border-slate-300 px-3 py-2"
                >
                  <option value="">No group / any</option>
                  {groupsForFaculty(newSection.facultyId).map((gr) => (
                    <option key={gr.id} value={gr.id}>
                      {gr.name}
                    </option>
                  ))}
                </select>
              </>
            )}
            <input
              type="text"
              placeholder="Section (e.g. A)"
              value={newSection.name}
              onChange={(e) => setNewSection((s) => ({ ...s, name: e.target.value }))}
              className="w-32 rounded border border-slate-300 px-3 py-2"
            />
            <button type="submit" disabled={addSectionLoading} className="btn-primary inline-flex items-center gap-2">
                {addSectionLoading ? <Spinner /> : null}
                {addSectionLoading ? "Adding…" : "Add Section"}
              </button>
          </form>
          <div className="table-wrapper">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th>Grade</th>
                  <th>Semester</th>
                  <th>Faculty</th>
                  <th>Group</th>
                  <th>Section</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sections
                  .slice((tablePage.sections - 1) * TABLE_PAGE_SIZE, tablePage.sections * TABLE_PAGE_SIZE)
                  .map((s) => (
                  <tr key={s.id}>
                    <td className="font-medium">{s.grade?.label ?? "—"}</td>
                    <td>{s.semester != null ? `Sem ${s.semester.number}` : "—"}</td>
                    <td>{s.faculty?.name ?? "—"}</td>
                    <td>{s.group?.name ?? "—"}</td>
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
          <Pagination
            totalItems={sections.length}
            currentPage={tablePage.sections}
            pageSize={TABLE_PAGE_SIZE}
            onPageChange={(p) => setTablePage((s) => ({ ...s, sections: p }))}
            label="sections"
          />
        </section>
      )}

      {/* Classes section */}
      {activeTab === "classes" && (
        <section>
          <h2 className="mb-4 font-semibold text-slate-800">Classes</h2>
          <p className="mb-3 text-sm text-slate-600">
            For Bachelor/Master: select Grade → Semester → Faculty → optional Group → Section. For Grade 11–12: Grade → Faculty → Group → Section. For others: Grade → Section only.
          </p>
          <div className="mb-2 flex items-center gap-2">
            <input
              type="text"
              placeholder="Search classes by name..."
              value={classSearch}
              onChange={(e) => setClassSearch(e.target.value)}
              className="max-w-xs flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <form onSubmit={addClass} className="mb-4 flex flex-wrap gap-2">
            <select
              value={newClass.gradeId}
              onChange={(e) =>
                setNewClass((c) => ({ ...c, gradeId: e.target.value, semesterId: "", facultyId: "", groupId: "", sectionId: "" }))
              }
              className="rounded border border-slate-300 px-3 py-2"
            >
              <option value="">Select grade</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
            {newClass.gradeId && grades.find((g) => g.id === newClass.gradeId) && isSemesterEligibleGrade(grades.find((g) => g.id === newClass.gradeId)!) && (
              <select
                value={newClass.semesterId}
                onChange={(e) =>
                  setNewClass((c) => ({ ...c, semesterId: e.target.value, facultyId: "", groupId: "", sectionId: "" }))
                }
                className="rounded border border-slate-300 px-3 py-2"
              >
                <option value="">Select semester</option>
                {semestersForGrade(newClass.gradeId).map((sem) => (
                  <option key={sem.id} value={sem.id}>
                    Semester {sem.number}
                  </option>
                ))}
              </select>
            )}
            {newClass.gradeId && grades.find((g) => g.id === newClass.gradeId) && isFacultyEligibleGrade(grades.find((g) => g.id === newClass.gradeId)!) && (
              <>
                <select
                  value={newClass.facultyId}
                  onChange={(e) =>
                    setNewClass((c) => ({ ...c, facultyId: e.target.value, groupId: "", sectionId: "" }))
                  }
                  className="rounded border border-slate-300 px-3 py-2"
                >
                  <option value="">Select faculty</option>
                  {facultiesForGrade(newClass.gradeId).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <select
                  value={newClass.groupId}
                  onChange={(e) =>
                    setNewClass((c) => ({ ...c, groupId: e.target.value, sectionId: "" }))
                  }
                  className="rounded border border-slate-300 px-3 py-2"
                >
                  <option value="">No group / any</option>
                  {groupsForFaculty(newClass.facultyId).map((gr) => (
                    <option key={gr.id} value={gr.id}>
                      {gr.name}
                    </option>
                  ))}
                </select>
              </>
            )}
            <select
              value={newClass.sectionId}
              onChange={(e) => setNewClass((c) => ({ ...c, sectionId: e.target.value }))}
              className="rounded border border-slate-300 px-3 py-2"
            >
              <option value="">Select section</option>
              {sectionsForClass(newClass.gradeId, newClass.semesterId, newClass.facultyId, newClass.groupId).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.semester ? `Sem ${s.semester.number} - ` : ""}
                  {s.faculty?.name ?? ""}{s.faculty ? " - " : ""}{s.name}
                  {s.group ? ` (${s.group.name})` : ""}
                </option>
              ))}
            </select>
            <button type="submit" disabled={addClassLoading} className="btn-primary inline-flex items-center gap-2">
                {addClassLoading ? <Spinner /> : null}
                {addClassLoading ? "Creating…" : "Create Class"}
              </button>
          </form>
          <div className="table-wrapper">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Grade</th>
                  <th>Faculty</th>
                  <th>Group</th>
                  <th>Section</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses
                  .slice((tablePage.classes - 1) * TABLE_PAGE_SIZE, tablePage.classes * TABLE_PAGE_SIZE)
                  .map((c) => (
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
                    <td>{c.section?.faculty?.name ?? "—"}</td>
                    <td>{c.section?.group?.name ?? "—"}</td>
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
                                revalidate();
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
          <Pagination
            totalItems={filteredClasses.length}
            currentPage={tablePage.classes}
            pageSize={TABLE_PAGE_SIZE}
            onPageChange={(p) => setTablePage((s) => ({ ...s, classes: p }))}
            label="classes"
          />
        </section>
      )}
    </div>
  );
}

export default function GradesClassesPage() {
  return (
    <Suspense fallback={<p className="loading-text">Loading...</p>}>
      <GradesClassesPageContent />
    </Suspense>
  );
}
