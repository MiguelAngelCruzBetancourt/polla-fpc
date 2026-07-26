"use client";

import { CheckCircle2, Info, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

const VARIANT_ICON: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 size={18} className="text-success" />,
  error: <XCircle size={18} className="text-error" />,
  info: <Info size={18} className="text-info" />,
};

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                role="status"
                className="animate-in pointer-events-auto flex items-center gap-2 rounded-lg bg-surface px-4 py-3 text-sm text-text shadow-md"
              >
                {VARIANT_ICON[toast.variant]}
                {toast.message}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
