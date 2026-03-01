"use client";

import { useEffect, useState } from "react";

type ConfigType = "LOWER" | "HIGHER";

interface Config {
  id?: string;
  type: ConfigType;
  periodsPerDay: number;
  periodDuration: number;
  breaks: Array<{ type: string; afterPeriod: number; duration: number }>;
  assembly: { periodIndex: number; duration: number } | null;
}

export default function ScheduleConfigPage() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ConfigType | null>(null);
  const [form, setForm] = useState<Config>({
    type: "LOWER",
    periodsPerDay: 6,
    periodDuration: 45,
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
        breaks: Array.isArray(c.breaks) ? (c.breaks as Config["breaks"]) : [],
        assembly: c.assembly as Config["assembly"],
      });
    } else {
      setForm({
        type,
        periodsPerDay: 6,
        periodDuration: 45,
        breaks: [{ type: "SHORT", afterPeriod: 2, duration: 15 }, { type: "LUNCH", afterPeriod: 4, duration: 30 }],
        assembly: { periodIndex: 0, duration: 15 },
      });
    }
    setEditing(type);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    } catch {
      alert("Failed to save.");
    }
  }

  if (loading) return <p className="loading-text">Loading...</p>;

  return (
    <div>
      <h1 className="page-title mb-8">Schedule Config</h1>
      <p className="mb-4 text-sm text-slate-600">LOWER = Grade 1–3, HIGHER = Grade 4–10.</p>
      <div className="flex gap-4">
        {(["LOWER", "HIGHER"] as const).map((type) => (
          <div key={type} className="card card-hover p-5">
            <h2 className="font-semibold text-slate-800">{type}</h2>
            {configs.find((c) => c.type === type) ? (
              <p className="mt-1 text-sm text-slate-600">
                {configs.find((c) => c.type === type)?.periodsPerDay} periods ×{" "}
                {configs.find((c) => c.type === type)?.periodDuration} min
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-500">Not configured</p>
            )}
            <button
              type="button"
              onClick={() => openEdit(type)}
              className="btn-secondary mt-2 text-sm"
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      {editing && (
        <form onSubmit={handleSubmit} className="card mt-6 max-w-md space-y-4 p-6">
          <h3 className="font-semibold">{editing}</h3>
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
            <label className="block text-sm font-medium text-slate-700">Period duration (min)</label>
            <input
              type="number"
              min={30}
              max={120}
              value={form.periodDuration}
              onChange={(e) => setForm((f) => ({ ...f, periodDuration: Number(e.target.value) }))}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Assembly (period index, duration min)</label>
            <div className="mt-1 flex gap-2">
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
            </div>
          </div>
          <p className="text-xs text-slate-500">Breaks: edit in JSON if needed (afterPeriod, type SHORT/LUNCH, duration).</p>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Save</button>
            <button type="button" onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
