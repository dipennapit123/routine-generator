"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

interface Slot {
  id: string;
  classId: string;
  day: number;
  periodIndex: number;
  slotType: string;
  subjectId: string | null;
  teacherId: string | null;
  resourceId: string | null;
  notes: string | null;
  classRoom?: { displayName: string };
  subject?: { name: string };
  teacher?: { name: string };
  resource?: { name: string };
}

interface Version {
  id: string;
  name: string;
  status: string;
  routineSlots: Slot[];
}

export default function RoutineVersionPage() {
  const params = useParams();
  const router = useRouter();
  const versionId = params.versionId as string;
  const [version, setVersion] = useState<Version | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"class" | "teacher" | "resource">("class");
  const [filterId, setFilterId] = useState("");
  const [classes, setClasses] = useState<{ id: string; displayName: string }[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [resources, setResources] = useState<{ id: string; name: string }[]>([]);
  const [editSlot, setEditSlot] = useState<Slot | null>(null);
  const [editForm, setEditForm] = useState({
    slotType: "CLASS" as string,
    subjectId: "",
    teacherId: "",
    resourceId: "",
    notes: "",
  });
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!versionId) return;
    fetch(`/api/routine/${versionId}`)
      .then((r) => r.json())
      .then((data) => {
        setVersion(data);
        const slots = data.routineSlots ?? [];
        const classNames = new Map<string, string>();
        const teacherNames = new Map<string, string>();
        const resourceNames = new Map<string, string>();
        for (const s of slots) {
          if (s.classRoom?.displayName) classNames.set(s.classId, s.classRoom.displayName);
          if (s.teacher?.name && s.teacherId) teacherNames.set(s.teacherId, s.teacher.name);
          if (s.resource?.name && s.resourceId) resourceNames.set(s.resourceId, s.resource.name);
        }
        const classIds = [...new Set(slots.map((s: Slot) => s.classId).filter(Boolean))] as string[];
        setClasses(classIds.map((id) => ({ id, displayName: classNames.get(id) ?? id })));
        const teacherIds = [...new Set(slots.map((s: Slot) => s.teacherId).filter(Boolean))] as string[];
        setTeachers(teacherIds.map((id) => ({ id, name: teacherNames.get(id) ?? id })));
        const resourceIds = [...new Set(slots.map((s: Slot) => s.resourceId).filter(Boolean))] as string[];
        setResources(resourceIds.map((id) => ({ id, name: resourceNames.get(id) ?? id })));
        if (classIds.length) setFilterId((f) => (f ? f : classIds[0]));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [versionId]);

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((data) => setSubjects(Array.isArray(data) ? data : []));
    return () => {};
  }, []);

  const slots = useMemo(() => version?.routineSlots ?? [], [version?.routineSlots]);
  const periods = useMemo(
    () => Math.max(0, ...slots.map((s) => s.periodIndex)) + 1,
    [slots]
  );
  const filteredSlots = useMemo(() => {
    if (!filterId) return slots;
    if (view === "class") return slots.filter((s) => s.classId === filterId);
    if (view === "teacher") return slots.filter((s) => s.teacherId === filterId);
    if (view === "resource") return slots.filter((s) => s.resourceId === filterId);
    return slots;
  }, [slots, view, filterId]);
  const grid = useMemo(() => {
    const m = new Map<string, Slot>();
    filteredSlots.forEach((s) => m.set(`${s.day}-${s.periodIndex}`, s));
    return m;
  }, [filteredSlots]);

  function openEdit(slot: Slot) {
    setEditSlot(slot);
    setEditForm({
      slotType: slot.slotType,
      subjectId: slot.subjectId ?? "",
      teacherId: slot.teacherId ?? "",
      resourceId: slot.resourceId ?? "",
      notes: slot.notes ?? "",
    });
  }

  async function saveEdit() {
    if (!editSlot) return;
    try {
      await fetch(`/api/routine/slot/${editSlot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotType: editForm.slotType,
          subjectId: editForm.subjectId || null,
          teacherId: editForm.teacherId || null,
          resourceId: editForm.resourceId || null,
          notes: editForm.notes || null,
        }),
      });
      setEditSlot(null);
      const res = await fetch(`/api/routine/${versionId}`);
      setVersion(await res.json());
    } catch {
      alert("Failed to update.");
    }
  }

  async function publish() {
    try {
      await fetch(`/api/routine/${versionId}/publish`, { method: "POST" });
      setVersion((v) => (v ? { ...v, status: "PUBLISHED" } : null));
    } catch {
      alert("Failed.");
    }
  }

  async function archive() {
    try {
      await fetch(`/api/routine/${versionId}/archive`, { method: "POST" });
      router.push("/dashboard/routine");
    } catch {
      alert("Failed.");
    }
  }

  if (loading || !version) return <p className="loading-text">Loading...</p>;

  const currentFilterLabel =
    view === "class"
      ? classes.find((c) => c.id === filterId)?.displayName
      : view === "teacher"
        ? teachers.find((t) => t.id === filterId)?.name
        : resources.find((r) => r.id === filterId)?.name;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/routine" className="font-medium text-[var(--accent)] hover:underline">
            ← Back to versions
          </Link>
          <h1 className="page-title mb-0">{version.name}</h1>
          <span
            className={`badge ${
              version.status === "PUBLISHED"
                ? "badge-success"
                : version.status === "ARCHIVED"
                  ? "badge-neutral"
                  : "badge-warning"
            }`}
          >
            {version.status}
          </span>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/export/excel?versionId=${versionId}`}
            className="btn-secondary text-sm"
          >
            Export Excel
          </a>
          <a
            href={`/api/export/pdf?versionId=${versionId}`}
            className="btn-secondary text-sm"
          >
            Export PDF
          </a>
          {version.status === "DRAFT" && (
            <>
              <button type="button" onClick={publish} className="btn-primary text-sm bg-green-600 hover:bg-green-700">
                Publish
              </button>
              <button type="button" onClick={archive} className="btn-secondary text-sm text-red-600 border-red-200 hover:bg-red-50">
                Archive
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="font-medium">View:</span>
        {(["class", "teacher", "resource"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => {
              setView(v);
              if (v === "class" && classes.length) setFilterId(classes[0].id);
              else if (v === "teacher" && teachers.length) setFilterId(teachers[0].id);
              else if (v === "resource" && resources.length) setFilterId(resources[0].id);
              else setFilterId("");
            }}
            className={`rounded px-3 py-1 text-sm ${view === v ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
        {view === "class" && (
          <select
            value={filterId}
            onChange={(e) => setFilterId(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName}
              </option>
            ))}
          </select>
        )}
        {view === "teacher" && (
          <select
            value={filterId}
            onChange={(e) => setFilterId(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
        {view === "resource" && (
          <select
            value={filterId}
            onChange={(e) => setFilterId(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          >
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        )}
        {currentFilterLabel && <span className="text-slate-600">{currentFilterLabel}</span>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-slate-200 text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-200 px-1 py-1 text-left">Period</th>
              {DAY_NAMES.map((d) => (
                <th key={d} className="border border-slate-200 px-1 py-1 text-center">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: periods }, (_, p) => (
              <tr key={p}>
                <td className="border border-slate-200 px-1 py-1 font-medium">P{p + 1}</td>
                {DAY_NAMES.map((_, d) => {
                  const slot = grid.get(`${d}-${p}`);
                  if (!slot) return <td key={d} className="border border-slate-200 px-1 py-1" />;
                  const isClass = slot.slotType === "CLASS";
                  const text =
                    view === "class"
                      ? isClass
                        ? slot.subject?.name
                          ? `${slot.subject.name}${slot.teacher?.name ? ` (${slot.teacher.name})` : ""}`
                          : slot.teacher?.name
                            ? `Class teacher (${slot.teacher.name})`
                            : "Class teacher"
                        : slot.slotType
                      : view === "teacher"
                        ? slot.classRoom?.displayName ?? ""
                        : slot.classRoom?.displayName ?? "";
                  return (
                    <td
                      key={d}
                      className={`border border-slate-200 px-1 py-0.5 text-center ${
                        slot.slotType === "BREAK" || slot.slotType === "LUNCH"
                          ? "bg-slate-100"
                          : slot.slotType === "ASSEMBLY"
                            ? "bg-amber-50"
                            : "bg-white"
                      } cursor-pointer hover:bg-indigo-50`}
                      onClick={() => openEdit(slot)}
                      title={slot.notes ?? undefined}
                    >
                      <span className="line-clamp-2 text-xs">{text || slot.slotType}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editSlot && (
        <div className="modal-overlay fixed inset-0 z-10 flex items-center justify-center p-4">
          <div className="modal-content w-full max-w-md p-6">
            <h3 className="mb-5 text-lg font-semibold text-[var(--text-primary)]">Edit Slot</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)]">Slot type</label>
                <select
                  value={editForm.slotType}
                  onChange={(e) => setEditForm((f) => ({ ...f, slotType: e.target.value }))}
                  className="input mt-1.5"
                >
                  <option value="CLASS">CLASS</option>
                  <option value="BREAK">BREAK</option>
                  <option value="LUNCH">LUNCH</option>
                  <option value="ASSEMBLY">ASSEMBLY</option>
                  <option value="FREE">FREE</option>
                </select>
              </div>
              {editForm.slotType === "CLASS" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">Subject</label>
                    <select
                      value={editForm.subjectId}
                      onChange={(e) => setEditForm((f) => ({ ...f, subjectId: e.target.value }))}
                      className="input mt-1.5"
                    >
                      <option value="">—</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">Teacher</label>
                    <select
                      value={editForm.teacherId}
                      onChange={(e) => setEditForm((f) => ({ ...f, teacherId: e.target.value }))}
                      className="input mt-1.5"
                    >
                      <option value="">—</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">Resource</label>
                    <select
                      value={editForm.resourceId}
                      onChange={(e) => setEditForm((f) => ({ ...f, resourceId: e.target.value }))}
                      className="input mt-1.5"
                    >
                      <option value="">—</option>
                      {resources.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)]">Notes</label>
                <input
                  type="text"
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  className="input mt-1.5"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={saveEdit} className="btn-primary">Save</button>
              <button type="button" onClick={() => setEditSlot(null)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
