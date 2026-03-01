"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Version {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  _count?: { routineSlots: number };
}

export default function RoutinePage() {
  const router = useRouter();
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateOpts, setGenerateOpts] = useState({
    configType: "HIGHER" as "LOWER" | "HIGHER",
    firstPeriodPriorityOverride: undefined as boolean | undefined,
    seed: undefined as number | undefined,
  });

  useEffect(() => {
    fetch("/api/routine")
      .then((r) => r.json())
      .then((data) => {
        setVersions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
      setVersions((prev) => prev.map((v) => (v.id === versionId ? { ...v, status: "ARCHIVED" } : v)));
    } catch {
      alert("Failed.");
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
            {versions.map((v) => (
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
                    <button type="button" onClick={() => archive(v.id)} className="text-red-600 hover:underline">
                      Archive
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
                  onChange={(e) => setGenerateOpts((o) => ({ ...o, configType: e.target.value as "LOWER" | "HIGHER" }))}
                  className="input mt-1.5"
                >
                  <option value="LOWER">LOWER (Grade 1–3)</option>
                  <option value="HIGHER">HIGHER (Grade 4–10)</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="fpp"
                  checked={generateOpts.firstPeriodPriorityOverride === true}
                  onChange={(e) =>
                    setGenerateOpts((o) => ({
                      ...o,
                      firstPeriodPriorityOverride: e.target.checked ? true : undefined,
                    }))
                  }
                  className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)]"
                />
                <label htmlFor="fpp" className="text-sm text-[var(--text-primary)]">First period = class teacher (override)</label>
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
