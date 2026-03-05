"use client";

const PAGE_SIZE_DEFAULT = 10;

export interface PaginationProps {
  totalItems: number;
  currentPage: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  label?: string;
}

export function Pagination({
  totalItems,
  currentPage,
  pageSize = PAGE_SIZE_DEFAULT,
  onPageChange,
  label = "items",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.max(1, Math.min(currentPage, totalPages));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  if (totalItems === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
      <p className="text-sm text-slate-600">
        Showing <span className="font-medium">{start}</span>–<span className="font-medium">{end}</span> of{" "}
        <span className="font-medium">{totalItems}</span> {label}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <span className="px-2 text-sm text-slate-600">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export const TABLE_PAGE_SIZE = PAGE_SIZE_DEFAULT;
