"use client";

import React from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Edit3, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertType = "success" | "edit" | "error" | "warning";

interface AlertBoxProps {
  type: AlertType;
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

export function AlertBox({ type, title, message, onClose, className }: AlertBoxProps) {
  const alertStyles = {
    error: {
      bg: "bg-red-50 text-red-900 border-red-200",
      iconBg: "bg-red-100 text-red-600",
      Icon: AlertCircle,
    },
    success: {
      bg: "bg-emerald-50 text-emerald-900 border-emerald-200",
      iconBg: "bg-emerald-100 text-emerald-600",
      Icon: CheckCircle2,
    },
    edit: {
      bg: "bg-blue-50 text-blue-900 border-blue-200",
      iconBg: "bg-blue-100 text-blue-600",
      Icon: Edit3,
    },
    warning: {
      bg: "bg-amber-50 text-amber-900 border-amber-200",
      iconBg: "bg-amber-100 text-amber-600",
      Icon: AlertTriangle,
    },
  };

  const style = alertStyles[type] || alertStyles.error;
  const IconComponent = style.Icon;

  return (
    <div
      className={cn(
        "p-4 rounded-2xl border shadow-md flex items-center justify-between gap-3 transition-all animate-in fade-in slide-in-from-top-2 duration-300",
        style.bg,
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold", style.iconBg)}>
          <IconComponent className="w-5 h-5" />
        </div>

        <div>
          {title && <h4 className="text-[11px] font-bold uppercase tracking-wider opacity-80 mb-0.5">{title}</h4>}
          <p className="text-xs md:text-sm font-bold leading-relaxed">{message}</p>
        </div>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-black/5 transition-colors shrink-0 text-current opacity-70 hover:opacity-100"
          title="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
