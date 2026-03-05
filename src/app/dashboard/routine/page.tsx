"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import { Pagination, TABLE_PAGE_SIZE } from "@/components/Pagination";

interface Version {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  _count?: { routineSlots: number };
}

const ROUTINE_KEY = "/api/routine";

export default function RoutinePage() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { data: versionsData, isLoading: loading } = useSWR<Version[]>(ROUTINE_KEY);
  const versions = Array.isArray(versionsData) ? versionsData : [];
  const [routineTablePage, setRoutineTablePage] = useState(1);
  const [modal, setModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateOpts, setGenerateOpts] = useState({
    configType: "HIGHER" as
      | "PRE_PRIMARY"
      | "LOWER"
      | "HIGHER"
      | "PLUS_TWO"
      | "BACHELOR"
      | "MASTER",
    firstPeriodPriorityOverride: true as boolean | undefined,
    seed: undefined as number | undefined,
  });

  useEffect(() => {
    const q = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    if (q.get("generate") === "1") setModal(true);
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await fetch("/api/routine/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configType: generateOpts.configType,
          firstPeriodPriorityOverride: generateOpts.firstPeriodPriorityOverride,
          seed: generateOpts.seed,
        }),
      });
      const data = await res.json();
      if (data.success && data.versionId) {
        setModal(false);
        router.push(`/dashboard/routine/${data.versionId}`);
      } else {
        const msg = [
          ...(data.errors || ["Generation failed."]),
          data.suggestions?.length ? ["", "Suggestions:", ...data.suggestions] : [],
        ].flat().join("\n");
        alert(msg);
      }
    } catch {
      alert("Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  async function duplicate(versionId: string) {
    try {
      const res = await fetch(`/api/routine/${versionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate" }),
      });
      const data = await res.json();
      if (data.versionId) router.push(`/dashboard/routine/${data.versionId}`);
    } catch {
      alert("Failed.");
    }
  }

  async function archive(versionId: string) {
    try {
      await fetch(`/api/routine/${versionId}/archive`, { method: "POST" });
      void mutate(ROUTINE_KEY);
    } catch {
      alert("Failed.");
    }
  }

  async function deleteVersion(versionId: string) {
    if (!confirm("Delete this routine permanently? This cannot be undone.")) return;
    try {
      await fetch(`/api/routine/${versionId}`, { method: "DELETE" });
      void mutate(ROUTINE_KEY);
    } catch {
      alert("Failed to delete.");
    }
  }

  if (loading) return <p className="loading-text">Loading...</p>;

  return (
    <div>
      <h1 className="page-title mb-8">Routine Versions</h1>
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setModal(true)}
          className="btn-primary"
        >
          Generate New Routine
        </button>
      </div>

      <div className="card mb-6 p-4">
        <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
          Minimum setup before generating
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
          <li>Fill <strong>School Settings</strong> and <strong>Schedule Config</strong> (periods per day, breaks).</li>
          <li>Create <strong>Grades, Sections & Classes</strong> in “Grades &amp; Classes”.</li>
          <li>Add <strong>Subjects</strong> and <strong>Teachers</strong>.</li>
          <li>Define <strong>Subject Requirements</strong> (periods per week) in “Requirements”.</li>
          <li>In “Appointing”, set <strong>Class Teachers</strong> and assign <strong>Subject Teachers</strong> to each class.</li>
        </ul>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          The generator will also show a detailed minimum requirement message if anything is still missing.
        </p>
      </div>

      <div className="table-wrapper">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {versions
              .slice((routineTablePage - 1) * TABLE_PAGE_SIZE, routineTablePage * TABLE_PAGE_SIZE)
              .map((v) => (
              <tr key={v.id}>
                <td className="font-medium">{v.name}</td>
                <td>
                  <span
                    className={`badge ${
                      v.status === "PUBLISHED"
                        ? "badge-success"
                        : v.status === "ARCHIVED"
                          ? "badge-neutral"
                          : "badge-warning"
                    }`}
                  >
                    {v.status}
                  </span>
                </td>
                <td className="text-[var(--text-muted)]">
                  {new Date(v.createdAt).toLocaleDateString()}
                </td>
                <td>
                  <Link href={`/dashboard/routine/${v.id}`} className="font-medium text-[var(--accent)] hover:underline mr-3">
                    Open
                  </Link>
                  <button type="button" onClick={() => duplicate(v.id)} className="text-[var(--text-secondary)] hover:underline mr-3">
                    Duplicate
                  </button>
                  {v.status !== "ARCHIVED" && (
                    <button type="button" onClick={() => archive(v.id)} className="text-[var(--text-secondary)] hover:underline mr-3">
                      Archive
                    </button>
                  )}
                  <button type="button" onClick={() => deleteVersion(v.id)} className="text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        totalItems={versions.length}
        currentPage={routineTablePage}
        pageSize={TABLE_PAGE_SIZE}
        onPageChange={setRoutineTablePage}
        label="routines"
      />

      {modal && (
        <div className="modal-overlay fixed inset-0 z-10 flex items-center justify-center p-4">
          <form onSubmit={handleGenerate} className="modal-content w-full max-w-md p-6">
            <h3 className="mb-5 text-lg font-semibold text-[var(--text-primary)]">
              Generate New Routine
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)]">Config type</label>
                <select
                  value={generateOpts.configType}
                  onChange={(e) =>
                    setGenerateOpts((o) => ({
                      ...o,
                      configType: e.target.value as typeof o.configType,
                    }))
                  }
                  className="input mt-1.5"
                >
                  <option value="PRE_PRIMARY">PRE_PRIMARY (Nursery, LKG/JKG, UKG/SKG)</option>
                  <option value="LOWER">LOWER (Grade 1–3)</option>
                  <option value="HIGHER">HIGHER (Grade 4–10)</option>
                  <option value="PLUS_TWO">PLUS_TWO (Grade 11–12)</option>
                  <option value="BACHELOR">BACHELOR (4 years, 8 semesters)</option>
                  <option value="MASTER">MASTER (4 semesters)</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="fpp"
                  checked={generateOpts.firstPeriodPriorityOverride !== false}
                  onChange={(e) =>
                    setGenerateOpts((o) => ({
                      ...o,
                      firstPeriodPriorityOverride: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)]"
                />
                <label htmlFor="fpp" className="text-sm text-[var(--text-primary)]">
                  First period = class teacher (each class’s first period is assigned to their class teacher)
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)]">Random seed (optional)</label>
                <input
                  type="number"
                  value={generateOpts.seed ?? ""}
                  onChange={(e) =>
                    setGenerateOpts((o) => ({
                      ...o,
                      seed: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="input mt-1.5"
                  placeholder="Leave empty for auto"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={generating}
                className="btn-primary disabled:opacity-50"
              >
                {generating ? "Generating..." : "Generate"}
              </button>
              <button type="button" onClick={() => setModal(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
