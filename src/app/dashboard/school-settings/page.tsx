"use client";

import { useEffect, useState } from "react";

export default function SchoolSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    schoolName: "My School",
    academicYear: "2024-2025",
    firstPeriodPriority: true,
  });

  useEffect(() => {
    fetch("/api/school-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.schoolName) {
          setForm({
            schoolName: data.schoolName,
            academicYear: data.academicYear ?? "2024-2025",
            firstPeriodPriority: data.firstPeriodPriority ?? true,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/school-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
      <h1 className="page-title mb-8">School Settings</h1>
      <form
        onSubmit={handleSubmit}
        className="card max-w-md space-y-5 p-6"
      >
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)]">
            School Name
          </label>
          <input
            type="text"
            value={form.schoolName}
            onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))}
            className="input mt-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)]">
            Academic Year
          </label>
          <input
            type="text"
            value={form.academicYear}
            onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
            className="input mt-2"
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="fpp"
            checked={form.firstPeriodPriority}
            onChange={(e) => setForm((f) => ({ ...f, firstPeriodPriority: e.target.checked }))}
            className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <label htmlFor="fpp" className="text-sm font-medium text-[var(--text-primary)]">
            First Period = Class Teacher Priority
          </label>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Week days: Sunday–Friday (fixed in config).
        </p>
        <button
          type="submit"
          disabled={saving}
          className="btn-primary disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
