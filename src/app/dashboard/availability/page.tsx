"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

function AvailabilityContent() {
  const searchParams = useSearchParams();
  const teacherIdParam = searchParams.get("teacherId");
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [teacherId, setTeacherId] = useState(teacherIdParam ?? "");
  const [grid, setGrid] = useState<Record<string, string>>({});
  const [periods, setPeriods] = useState(8);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/teachers")
      .then((r) => r.json())
      .then((data) => {
        setTeachers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (teacherIdParam) setTeacherId(teacherIdParam);
  }, [teacherIdParam]);

  useEffect(() => {
    if (!teacherId) {
      setGrid({});
      return;
    }
    fetch(`/api/availability?teacherId=${teacherId}`)
      .then((r) => r.json())
      .then((data) => {
        const g: Record<string, string> = {};
        if (Array.isArray(data)) {
          data.forEach((a: { day: number; periodIndex: number; status: string }) => {
            g[`${a.day}-${a.periodIndex}`] = a.status;
          });
        }
        setGrid(g);
      })
      .catch(() => setGrid({}));
  }, [teacherId]);

  function getStatus(day: number, period: number): string {
    return grid[`${day}-${period}`] ?? "AVAILABLE";
  }

  function setStatus(day: number, period: number, status: string) {
    const key = `${day}-${period}`;
    if (status === "AVAILABLE") {
      setGrid((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } else {
      setGrid((prev) => ({ ...prev, [key]: status }));
    }
  }

  async function handleSave() {
    if (!teacherId) {
      alert("Select a teacher.");
      return;
    }
    setSaving(true);
    try {
      const gridArray = [];
      for (let day = 0; day < 6; day++) {
        for (let p = 0; p < periods; p++) {
          gridArray.push({
            day,
            periodIndex: p,
            status: getStatus(day, p),
          });
        }
      }
      await fetch("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, grid: gridArray }),
      });
      alert("Saved.");
    } catch {
      alert("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="loading-text">Loading...</p>;

  return (
    <div>
      <h1 className="page-title mb-8">Teacher Availability</h1>
      <div className="mb-4 flex items-center gap-4">
        <label className="font-medium">Teacher</label>
        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2"
        >
          <option value="">Select teacher</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <label className="font-medium">Periods</label>
        <input
          type="number"
          min={1}
          max={12}
          value={periods}
          onChange={(e) => setPeriods(Number(e.target.value))}
          className="w-20 rounded border border-slate-300 px-2 py-2"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !teacherId}
          className="btn-primary disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      <p className="mb-2 text-sm text-slate-600">Click cell to cycle: AVAILABLE → BLOCKED → LEAVE → AVAILABLE</p>
      {teacherId && (
        <div className="overflow-x-auto">
          <table className="border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-200 px-2 py-1 text-left">Period</th>
                {DAYS.map((d, i) => (
                  <th key={d} className="border border-slate-200 px-2 py-1 text-center">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: periods }, (_, p) => (
                <tr key={p}>
                  <td className="border border-slate-200 px-2 py-1 font-medium">P{p + 1}</td>
                  {DAYS.map((_, d) => {
                    const status = getStatus(d, p);
                    return (
                      <td
                        key={d}
                        className="border border-slate-200 px-1 py-0.5 text-center text-xs cursor-pointer"
                        style={{
                          backgroundColor:
                            status === "BLOCKED" ? "#fecaca" : status === "LEAVE" ? "#fef08a" : "#f0fdf4",
                        }}
                        onClick={() => {
                          const next =
                            status === "AVAILABLE" ? "BLOCKED" : status === "BLOCKED" ? "LEAVE" : "AVAILABLE";
                          setStatus(d, p, next);
                        }}
                      >
                        {status === "AVAILABLE" ? "✓" : status === "BLOCKED" ? "B" : "L"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AvailabilityPage() {
  return (
      <Suspense fallback={<p className="loading-text">Loading...</p>}>
      <AvailabilityContent />
    </Suspense>
  );
}
