"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/components/Toast";

interface ClassRoom {
  id: string;
  displayName: string;
}
interface Subject {
  id: string;
  name: string;
}
interface Teacher {
  id: string;
  name: string;
}

const ASSIGNMENTS_KEY = "/api/assignments";
const CLASSES_KEY = "/api/classes";
const SUBJECTS_KEY = "/api/subjects";
const TEACHERS_KEY = "/api/teachers";
const TEACHER_SUBJECT_KEY = "/api/teacher-subject";

export default function AddAssignmentPage() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const toast = useToast();
  const { data: classesData } = useSWR<ClassRoom[]>(CLASSES_KEY);
  const { data: subjectsData } = useSWR<Subject[]>(SUBJECTS_KEY);
  const { data: teachersData } = useSWR<Teacher[]>(TEACHERS_KEY);
  const { data: tsData } = useSWR<{ teacherId: string; subjectId: string }[]>(TEACHER_SUBJECT_KEY);

  const classes = Array.isArray(classesData) ? classesData : [];
  const subjects = Array.isArray(subjectsData) ? subjectsData : [];
  const teachers = Array.isArray(teachersData) ? teachersData : [];
  const teacherSubjects = Array.isArray(tsData) ? tsData : [];

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ classId: "", subjectId: "", teacherId: "" });

  const teacherOptions =
    form.subjectId && teacherSubjects.some((ts) => ts.subjectId === form.subjectId)
      ? teachers.filter(
          (t) =>
            teacherSubjects.some((ts) => ts.teacherId === t.id && ts.subjectId === form.subjectId) ||
            t.id === form.teacherId
        )
      : teachers;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.classId || !form.subjectId || !form.teacherId) {
      toast.error("Select class, subject, and teacher.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Failed to add assignment.");
        return;
      }
      void mutate(ASSIGNMENTS_KEY);
      toast.success("Assignment added");
      setForm({ classId: "", subjectId: "", teacherId: "" });
      router.push("/dashboard/assignments");
    } catch {
      toast.error("Failed to add assignment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <h1 className="page-title mb-0">Add Assignment</h1>
        <Link
          href="/dashboard/assignments"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Appointing
        </Link>
      </div>
      <p className="mb-4 text-sm text-slate-600">
        Assign a teacher to teach a subject for a class. The teacher must be able to teach that subject (set in Teachers → Subjects they can teach).
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Class</label>
          <select
            value={form.classId}
            onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
            className="rounded border border-slate-300 px-3 py-2"
            required
          >
            <option value="">Select class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Subject</label>
          <select
            value={form.subjectId}
            onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value, teacherId: "" }))}
            className="rounded border border-slate-300 px-3 py-2"
            required
          >
            <option value="">Select subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Teacher</label>
          <select
            value={form.teacherId}
            onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}
            className="rounded border border-slate-300 px-3 py-2"
            required
          >
            <option value="">Select teacher</option>
            {teacherOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
          {saving ? <Spinner /> : null}
          {saving ? "Adding…" : "Add Assignment"}
        </button>
      </form>
    </div>
  );
}
