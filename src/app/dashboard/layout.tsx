"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/school-settings", label: "School Settings" },
  { href: "/dashboard/schedule-config", label: "Schedule Config" },
  { href: "/dashboard/grades-classes", label: "Grades & Classes" },
  { href: "/dashboard/subjects", label: "Subjects" },
  { href: "/dashboard/resources", label: "Resources" },
  { href: "/dashboard/teachers", label: "Teachers" },
  { href: "/dashboard/availability", label: "Availability" },
  { href: "/dashboard/assignments", label: "Assignments" },
  { href: "/dashboard/requirements", label: "Requirements" },
  { href: "/dashboard/routine", label: "Routine" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[var(--bg-page)]">
      <aside
        className="flex w-60 shrink-0 flex-col bg-[var(--bg-sidebar)] text-[var(--text-sidebar)]"
        style={{ boxShadow: "4px 0 24px -4px rgb(0 0 0 / 0.08)" }}
      >
        <div className="border-b border-white/10 px-5 py-5">
          <h2 className="text-lg font-bold tracking-tight text-white">
            Routine Generator
          </h2>
          <p className="mt-0.5 text-xs font-medium text-[var(--text-sidebar)]/80">
            School Timetable
          </p>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {nav.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--bg-sidebar-active)] text-[var(--text-sidebar-active)]"
                    : "text-[var(--text-sidebar)] hover:bg-[var(--bg-sidebar-hover)] hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
