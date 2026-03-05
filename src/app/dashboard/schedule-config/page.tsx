"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/components/Toast";

type ConfigType =
  | "PRE_PRIMARY"
  | "LOWER"
  | "HIGHER"
  | "PLUS_TWO"
  | "BACHELOR"
  | "MASTER";

interface Config {
  id?: string;
  type: ConfigType;
  periodsPerDay: number;
  periodDuration: number;
  classStartTime?: string | null;
  classEndTime?: string | null;
  breaks: Array<{ type: string; afterPeriod: number; duration: number }>;
  assembly: { periodIndex: number; duration: number } | null;
}

export default function ScheduleConfigPage() {
  const toast = useToast();
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ConfigType | null>(null);
  const [form, setForm] = useState<Config>({
    type: "LOWER",
    periodsPerDay: 6,
    periodDuration: 45,
    classStartTime: "09:00",
    classEndTime: "15:30",
    breaks: [{ type: "SHORT", afterPeriod: 2, duration: 15 }, { type: "LUNCH", afterPeriod: 4, duration: 30 }],
    assembly: { periodIndex: 0, duration: 15 },
  });

  useEffect(() => {
    fetch("/api/schedule-config")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setConfigs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function openEdit(type: ConfigType) {
    const c = configs.find((x) => x.type === type);
    if (c) {
      setForm({
        type: c.type,
        periodsPerDay: c.periodsPerDay,
        periodDuration: c.periodDuration,
        classStartTime: (c as Config).classStartTime ?? "09:00",
        classEndTime: (c as Config).classEndTime ?? "15:30",
        breaks: Array.isArray(c.breaks) ? (c.breaks as Config["breaks"]) : [],
        assembly: c.assembly as Config["assembly"],
      });
    } else {
      setForm({
        type,
        periodsPerDay: 6,
        periodDuration: 45,
        classStartTime: "09:00",
        classEndTime: "15:30",
        breaks: [{ type: "SHORT", afterPeriod: 2, duration: 15 }, { type: "LUNCH", afterPeriod: 4, duration: 30 }],
        assembly: { periodIndex: 0, duration: 15 },
      });
    }
    setEditing(type);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/schedule-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const res = await fetch("/api/schedule-config");
      const data = await res.json();
      if (Array.isArray(data)) setConfigs(data);
      setEditing(null);
      toast.success("Schedule config saved");
    } catch {
      toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="loading-text">Loading...</p>;

  return (
    <div>
      <h1 className="page-title mb-8">Schedule Config</h1>
      <p className="mb-4 text-sm text-slate-600">
        Configure different structures for pre-primary, school, higher secondary, and college levels.
      </p>
      <div className="flex flex-wrap gap-4">
        {([
          { id: "PRE_PRIMARY", label: "PRE_PRIMARY", desc: "Nursery, LKG/JKG, UKG/SKG" },
          { id: "LOWER", label: "LOWER", desc: "Grade 1–3" },
          { id: "HIGHER", label: "HIGHER", desc: "Grade 4–10" },
          { id: "PLUS_TWO", label: "PLUS_TWO", desc: "Grade 11–12" },
          { id: "BACHELOR", label: "BACHELOR", desc: "Bachelor (4 years, 8 semesters)" },
          { id: "MASTER", label: "MASTER", desc: "Master (4 semesters)" },
        ] as { id: ConfigType; label: string; desc: string }[]).map(({ id, label, desc }) => {
          const cfg = configs.find((c) => c.type === id) as Config | undefined;
          return (
          <div key={id} className="card card-hover w-full max-w-xs p-5">
            <h2 className="font-semibold text-slate-800">{label}</h2>
            <p className="mt-1 text-xs text-slate-500">{desc}</p>
            {cfg ? (
              <p className="mt-1 text-sm text-slate-600">
                {cfg.classStartTime && cfg.classEndTime ? (
                  <span>{cfg.classStartTime} – {cfg.classEndTime}<br /></span>
                ) : null}
                {cfg.periodsPerDay} periods × {cfg.periodDuration} min
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-500">Not configured</p>
            )}
            <button
              type="button"
              onClick={() => openEdit(id)}
              className="btn-secondary mt-2 text-sm"
            >
              Edit
            </button>
          </div>
          );
        })}
      </div>

      {editing && (
        <form onSubmit={handleSubmit} className="card mt-6 max-w-lg space-y-5 p-6">
          <h3 className="font-semibold text-slate-800">{editing}</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Class start time</label>
              <input
                type="time"
                value={form.classStartTime ?? "09:00"}
                onChange={(e) => setForm((f) => ({ ...f, classStartTime: e.target.value || null }))}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Class end time</label>
              <input
                type="time"
                value={form.classEndTime ?? "15:30"}
                onChange={(e) => setForm((f) => ({ ...f, classEndTime: e.target.value || null }))}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Class duration (minutes per period)</label>
            <input
              type="number"
              min={30}
              max={120}
              value={form.periodDuration}
              onChange={(e) => setForm((f) => ({ ...f, periodDuration: Number(e.target.value) }))}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
            <p className="mt-0.5 text-xs text-slate-500">Duration of each class period in minutes.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Periods per day</label>
            <input
              type="number"
              min={1}
              max={12}
              value={form.periodsPerDay}
              onChange={(e) => setForm((f) => ({ ...f, periodsPerDay: Number(e.target.value) }))}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Breaks (when and how long)</label>
            <p className="mt-0.5 text-xs text-slate-500 mb-2">Add breaks: after which period, type, and duration in minutes.</p>
            <div className="space-y-2">
              {form.breaks.map((b, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded border border-slate-200 bg-slate-50/50 p-2">
                  <span className="text-sm text-slate-600">After period</span>
                  <input
                    type="number"
                    min={0}
                    max={form.periodsPerDay}
                    value={b.afterPeriod}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        breaks: f.breaks.map((br, j) => (j === i ? { ...br, afterPeriod: Number(e.target.value) } : br)),
                      }))
                    }
                    className="w-16 rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <select
                    value={b.type}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        breaks: f.breaks.map((br, j) => (j === i ? { ...br, type: e.target.value } : br)),
                      }))
                    }
                    className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    <option value="SHORT">Short break</option>
                    <option value="LUNCH">Lunch</option>
                  </select>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={b.duration}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        breaks: f.breaks.map((br, j) => (j === i ? { ...br, duration: Number(e.target.value) } : br)),
                      }))
                    }
                    className="w-20 rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <span className="text-sm text-slate-500">min</span>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, breaks: f.breaks.filter((_, j) => j !== i) }))}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    breaks: [...f.breaks, { type: "SHORT", afterPeriod: Math.max(0, f.breaks.length), duration: 15 }],
                  }))
                }
                className="text-sm text-indigo-600 hover:underline"
              >
                + Add break
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Assembly (optional)</label>
            <p className="mt-0.5 text-xs text-slate-500 mb-1">Period index (0 = before 1st period) and duration in minutes.</p>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={form.assembly?.periodIndex ?? 0}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    assembly: { ...(f.assembly ?? { periodIndex: 0, duration: 15 }), periodIndex: Number(e.target.value) },
                  }))
                }
                className="w-24 rounded border border-slate-300 px-2 py-2"
              />
              <input
                type="number"
                min={5}
                value={form.assembly?.duration ?? 15}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    assembly: { ...(f.assembly ?? { periodIndex: 0, duration: 15 }), duration: Number(e.target.value) },
                  }))
                }
                className="w-24 rounded border border-slate-300 px-2 py-2"
              />
              <span className="self-center text-sm text-slate-500">min</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
            {saving ? <Spinner /> : null}
            {saving ? "Saving…" : "Save"}
          </button>
            <button type="button" onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
