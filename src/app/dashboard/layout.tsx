"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SWRConfig } from "swr";
import { ToastProvider } from "@/components/Toast";
import { swrConfig } from "@/lib/swr";

const nav: Array<
  | { href: string; label: string }
  | { label: string; children: { href: string; label: string }[] }
> = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/school-settings", label: "School Settings" },
  { href: "/dashboard/schedule-config", label: "Schedule Config" },
  {
    label: "Grades & Classes",
    children: [
      { href: "/dashboard/grades-classes?tab=grades", label: "Grades" },
      { href: "/dashboard/grades-classes?tab=faculties", label: "Faculties / Courses" },
      { href: "/dashboard/grades-classes?tab=groups", label: "Groups" },
      { href: "/dashboard/grades-classes?tab=semesters", label: "Semesters" },
      { href: "/dashboard/grades-classes?tab=sections", label: "Sections" },
      { href: "/dashboard/grades-classes?tab=classes", label: "Classes" },
    ],
  },
  { href: "/dashboard/subjects", label: "Subjects" },
  { href: "/dashboard/resources", label: "Resources" },
  {
    label: "Teachers",
    children: [
      { href: "/dashboard/teachers/add", label: "Add Teacher" },
      { href: "/dashboard/teachers", label: "Teacher list" },
    ],
  },
  { href: "/dashboard/availability", label: "Availability" },
  {
    label: "Appointing",
    children: [
      { href: "/dashboard/assignments?tab=grade-mode", label: "Grade mode" },
      { href: "/dashboard/assignments?tab=class-teacher", label: "Class teacher" },
      { href: "/dashboard/assignments?tab=class-teacher-list", label: "Class teacher list" },
    ],
  },
  { href: "/dashboard/requirements", label: "Requirements" },
  { href: "/dashboard/routine", label: "Routine" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isTeachersPath = pathname === "/dashboard/teachers" || pathname === "/dashboard/teachers/" || pathname.startsWith("/dashboard/teachers/");
  const isGradesClassesPath = pathname.startsWith("/dashboard/grades-classes");
  const isAssignmentsPath = pathname.startsWith("/dashboard/assignments");
  const gradesClassesTab = searchParams.get("tab");
  const [teachersExpanded, setTeachersExpanded] = useState(isTeachersPath);
  const [gradesClassesExpanded, setGradesClassesExpanded] = useState(isGradesClassesPath);
  const [assignmentsExpanded, setAssignmentsExpanded] = useState(isAssignmentsPath);
  useEffect(() => {
    if (isTeachersPath) setTeachersExpanded(true);
  }, [isTeachersPath]);
  useEffect(() => {
    if (isGradesClassesPath) setGradesClassesExpanded(true);
  }, [isGradesClassesPath]);
  useEffect(() => {
    if (isAssignmentsPath) setAssignmentsExpanded(true);
  }, [isAssignmentsPath]);

  return (
    <ToastProvider>
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
          {nav.map((item, i) => {
            if ("children" in item) {
              const isParentActive = item.children.some((c) => {
                if (c.href === "/dashboard/teachers")
                  return pathname === "/dashboard/teachers" || pathname === "/dashboard/teachers/";
                if (c.href.startsWith("/dashboard/grades-classes"))
                  return pathname.startsWith("/dashboard/grades-classes");
                if (c.href.startsWith("/dashboard/assignments"))
                  return pathname.startsWith("/dashboard/assignments");
                return pathname.startsWith(c.href);
              });
              const isExpanded =
                item.label === "Teachers" ? teachersExpanded
                : item.label === "Grades & Classes" ? gradesClassesExpanded
                : item.label === "Appointing" ? assignmentsExpanded
                : true;
              const setExpanded =
                item.label === "Teachers" ? setTeachersExpanded
                : item.label === "Grades & Classes" ? setGradesClassesExpanded
                : item.label === "Appointing" ? setAssignmentsExpanded
                : () => {};
              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() => typeof setExpanded === "function" && setExpanded((e: boolean) => !e)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                      isParentActive ? "text-[var(--text-sidebar-active)]" : "text-[var(--text-sidebar)] hover:bg-[var(--bg-sidebar-hover)] hover:text-white"
                    }`}
                  >
                    <span>{item.label}</span>
                    {(item.label === "Teachers" || item.label === "Grades & Classes" || item.label === "Appointing") && (
                      <span className="text-[var(--text-sidebar)]/80" aria-hidden>
                        {isExpanded ? "▼" : "▶"}
                      </span>
                    )}
                  </button>
                  {item.label === "Teachers" && teachersExpanded && (
                    <div className="ml-2 mt-0.5 space-y-0.5 border-l border-white/20 pl-2">
                      {item.children.map((child) => {
                        const isActive =
                          child.href === "/dashboard/teachers"
                            ? pathname === "/dashboard/teachers" || pathname === "/dashboard/teachers/"
                            : pathname === child.href || pathname.startsWith(child.href + "/");
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`block rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                              isActive
                                ? "bg-[var(--bg-sidebar-active)] text-[var(--text-sidebar-active)]"
                                : "text-[var(--text-sidebar)] hover:bg-[var(--bg-sidebar-hover)] hover:text-white"
                            }`}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                  {item.label === "Grades & Classes" && gradesClassesExpanded && (
                    <div className="ml-2 mt-0.5 space-y-0.5 border-l border-white/20 pl-2">
                      {item.children.map((child) => {
                        const childTab = new URL(child.href, "http://x").searchParams.get("tab");
                        const isChildActive = isGradesClassesPath && (gradesClassesTab || "grades") === childTab;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`block rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                              isChildActive
                                ? "bg-[var(--bg-sidebar-active)] text-[var(--text-sidebar-active)]"
                                : "text-[var(--text-sidebar)] hover:bg-[var(--bg-sidebar-hover)] hover:text-white"
                            }`}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                  {item.label === "Appointing" && assignmentsExpanded && (
                    <div className="ml-2 mt-0.5 space-y-0.5 border-l border-white/20 pl-2">
                      {item.children.map((child) => {
                        const childTab = child.href.includes("tab=") ? new URL(child.href, "http://x").searchParams.get("tab") : null;
                        const assignmentsTab = isAssignmentsPath ? searchParams.get("tab") : null;
                        const isActive = pathname.startsWith("/dashboard/assignments") && (childTab === assignmentsTab || (!assignmentsTab && childTab === "grade-mode"));
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`block rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                              isActive
                                ? "bg-[var(--bg-sidebar-active)] text-[var(--text-sidebar-active)]"
                                : "text-[var(--text-sidebar)] hover:bg-[var(--bg-sidebar-hover)] hover:text-white"
                            }`}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
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
        <SWRConfig value={swrConfig}>{children}</SWRConfig>
      </main>
    </div>
    </ToastProvider>
  );
}
