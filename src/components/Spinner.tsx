"use client";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md";
}

export function Spinner({ className = "", size = "sm" }: SpinnerProps) {
  const sizeClass = size === "sm" ? "h-4 w-4 border-2" : "h-5 w-5 border-2";
  return (
    <span
      className={`inline-block animate-spin rounded-full border-slate-300 border-t-indigo-600 ${sizeClass} ${className}`}
      aria-hidden
    />
  );
}
