"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastType = "success" | "error";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  const value: ToastContextValue = {
    toast,
    success: (msg) => toast(msg, "success"),
    error: (msg) => toast(msg, "error"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function Toaster({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: number) => void }) {
  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
      aria-live="polite"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => onRemove(t.id)}
          className={`flex min-w-[280px] max-w-sm items-center gap-3 rounded-lg border px-4 py-3 shadow-lg transition-opacity ${
            t.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {t.type === "success" ? (
            <span className="text-green-600" aria-hidden>✓</span>
          ) : (
            <span className="text-red-600" aria-hidden>✕</span>
          )}
          <p className="flex-1 text-sm font-medium">{t.message}</p>
        </div>
      ))}
    </div>
  );
}
