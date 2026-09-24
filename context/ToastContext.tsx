"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";
import { AlertBox, AlertType } from "@/components/ui/alert-box";

interface ToastMessage {
  id: string;
  type: AlertType;
  title?: string;
  message: string;
}

interface ToastContextType {
  showToast: (type: AlertType, message: string, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showEdit: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showDelete: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: AlertType, message: string, title?: string) => {
    setToasts((prev) => {
      // Deduplicate: avoid adding identical toast if already active
      const isDuplicate = prev.some(
        (t) => t.type === type && t.message === message && t.title === title
      );
      if (isDuplicate) return prev;

      const id = Date.now().toString() + Math.random().toString();
      const newToast = { id, type, title, message };

      setTimeout(() => {
        removeToast(id);
      }, 4500);

      const next = [...prev, newToast];
      // Keep maximum 3 toasts visible at once
      return next.length > 3 ? next.slice(-3) : next;
    });
  }, [removeToast]);

  const showSuccess = useCallback((message: string, title: string = "Berhasil Tambah") => showToast("success", message, title), [showToast]);
  const showEdit = useCallback((message: string, title: string = "Berhasil Edit") => showToast("edit", message, title), [showToast]);
  const showError = useCallback((message: string, title: string = "Gagal") => showToast("error", message, title), [showToast]);
  const showWarning = useCallback((message: string, title: string = "Peringatan") => showToast("warning", message, title), [showToast]);
  const showInfo = useCallback((message: string, title: string = "Informasi") => showToast("edit", message, title), [showToast]);
  const showDelete = useCallback((message: string, title: string = "Berhasil Hapus") => showToast("warning", message, title), [showToast]);

  const contextValue = useMemo(() => ({
    showToast,
    showSuccess,
    showEdit,
    showError,
    showWarning,
    showInfo,
    showDelete
  }), [showToast, showSuccess, showEdit, showError, showWarning, showInfo, showDelete]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      
      {/* GLOBAL FLOATING TOAST NOTIFICATION CONTAINER */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto shadow-lg animate-in slide-in-from-top-4 fade-in duration-300">
            <AlertBox
              type={toast.type}
              title={toast.title}
              message={toast.message}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: () => {},
      showSuccess: () => {},
      showEdit: () => {},
      showError: () => {},
      showWarning: () => {},
      showInfo: () => {},
      showDelete: () => {},
    };
  }
  return ctx;
}
