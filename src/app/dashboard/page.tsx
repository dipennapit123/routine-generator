"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function DashboardOverview() {
  const [stats, setStats] = useState<{
    teachers: number;
    classes: number;
    latestVersion: { id: string; name: string; status: string } | null;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [teachersRes, classesRes, routineRes] = await Promise.all([
          fetch("/api/teachers"),
          fetch("/api/classes"),
          fetch("/api/routine"),
        ]);
        const teachers = await teachersRes.json();
        const classes = await classesRes.json();
        const versions = await routineRes.json();
        const latest = Array.isArray(versions)
          ? versions.find((v: { status: string }) => v.status === "PUBLISHED") ?? versions[0]
          : null;
        setStats({
          teachers: Array.isArray(teachers) ? teachers.length : 0,
          classes: Array.isArray(classes) ? classes.length : 0,
          latestVersion: latest
            ? { id: latest.id, name: latest.name, status: latest.status }
            : null,
        });
      } catch {
        setStats({ teachers: 0, classes: 0, latestVersion: null });
      }
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="page-title mb-8">Dashboard</h1>
      <div className="mb-10 flex flex-wrap gap-3">
        <Link
          href="/dashboard/routine?generate=1"
          className="btn-primary inline-flex items-center"
        >
          Generate New Routine
        </Link>
        {stats?.latestVersion && (
          <Link
            href={`/dashboard/routine/${stats.latestVersion.id}`}
            className="btn-secondary inline-flex items-center"
          >
            View Published Routine
          </Link>
        )}
        <Link
          href="/dashboard/school-settings"
          className="btn-secondary inline-flex items-center"
        >
          Manage Data
        </Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="card card-hover p-6">
          <p className="text-sm font-medium text-[var(--text-muted)]">
            Teachers
          </p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            {stats?.teachers ?? "—"}
          </p>
        </div>
        <div className="card card-hover p-6">
          <p className="text-sm font-medium text-[var(--text-muted)]">
            Classes
          </p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            {stats?.classes ?? "—"}
          </p>
        </div>
        <div className="card card-hover p-6">
          <p className="text-sm font-medium text-[var(--text-muted)]">
            Latest Published
          </p>
          <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
            {stats?.latestVersion?.name ?? "—"}
          </p>
          {stats?.latestVersion && (
            <span
              className={`badge mt-2 ${
                stats.latestVersion.status === "PUBLISHED"
                  ? "badge-success"
                  : "badge-neutral"
              }`}
            >
              {stats.latestVersion.status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
