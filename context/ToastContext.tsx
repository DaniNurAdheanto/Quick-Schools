"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
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
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (type: AlertType, message: string, title?: string) => {
    const id = Date.now().toString() + Math.random().toString();
    const newToast = { id, type, title, message };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const showSuccess = (message: string, title: string = "Berhasil Tambah") => showToast("success", message, title);
  const showEdit = (message: string, title: string = "Berhasil Edit") => showToast("edit", message, title);
  const showError = (message: string, title: string = "Gagal") => showToast("error", message, title);
  const showWarning = (message: string, title: string = "Peringatan") => showToast("warning", message, title);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showEdit, showError, showWarning }}>
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
    };
  }
  return ctx;
}
