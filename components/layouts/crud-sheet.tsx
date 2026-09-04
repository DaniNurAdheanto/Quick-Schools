"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface CrudField {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

interface CrudSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit" | "delete";
  entityName: string;
  fields: CrudField[];
  initialData?: any;
  onSubmit?: (data: any) => Promise<void> | void;
  onDataChange?: (data: any) => void;
}

export function CrudSheet({
  open,
  onOpenChange,
  mode,
  entityName,
  fields,
  initialData,
  onSubmit,
  onDataChange
}: CrudSheetProps) {
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open) {
      const data = initialData || {};
      setFormData(data);
      if (onDataChange) onDataChange(data);
    }
  }, [open, initialData]);

  if (!open) return null;

  const isDelete = mode === "delete";

  const getTitle = () => {
    if (mode === "create") return `Tambah ${entityName}`;
    if (mode === "edit") return `Edit ${entityName}`;
    if (mode === "delete") return `Hapus ${entityName}`;
    return "";
  };

  const getDescription = () => {
    if (isDelete) return `Apakah Anda yakin ingin menghapus data ${entityName} ini? Tindakan ini tidak dapat dibatalkan.`;
    return `Silakan isi formulir di bawah ini untuk ${mode === "create" ? "menambahkan" : "memperbarui"} data ${entityName}.`;
  };

  const handleChange = (name: string, value: string | File) => {
    setFormData((prev: any) => {
      const next = { ...prev, [name]: value };
      if (onDataChange) onDataChange(next);
      return next;
    });
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      if (onSubmit) {
        await onSubmit(isDelete ? initialData : formData);
      }
      
      if (mode === "create") {
        toast.showSuccess(`Data ${entityName} berhasil ditambahkan.`, "Berhasil Tambah");
      } else if (mode === "edit") {
        toast.showEdit(`Data ${entityName} berhasil diperbarui.`, "Berhasil Edit");
      } else if (mode === "delete") {
        toast.showError(`Data ${entityName} berhasil dihapus.`, "Berhasil Hapus");
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast.showError(error?.message || `Gagal menyimpan data ${entityName}.`, "Gagal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-[500px] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 relative">
        
        {/* Header */}
        <div className="relative p-6 text-center border-b border-gray-100 bg-[#FAFAFA] rounded-t-2xl shrink-0">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
          <h2 className="relative text-[20px] font-extrabold text-gray-900 mb-2">{getTitle()}</h2>
          <p className="relative text-[13px] text-gray-400 font-medium px-4">
            {getDescription()}
          </p>
          <button 
            onClick={() => onOpenChange(false)} 
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {!isDelete ? (
            <div className="space-y-6">
              {fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <label className="text-[14px] font-bold text-gray-800">{field.label}</label>
                  {field.type === "select" ? (
                    <select
                      id={field.name}
                      value={formData[field.name] || ""}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] text-gray-900 focus:outline-none focus:ring-4 focus:ring-[#6E3BFF]/10 focus:border-[#6E3BFF] transition-all font-medium appearance-none bg-white"
                      disabled={isSubmitting}
                    >
                      <option value="" disabled>{field.placeholder || `Pilih ${field.label.toLowerCase()}`}</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "file" ? (
                    <input
                      id={field.name}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleChange(field.name, file);
                        }
                      }}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] text-gray-900 focus:outline-none focus:ring-4 focus:ring-[#6E3BFF]/10 focus:border-[#6E3BFF] transition-all font-medium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#6E3BFF]/10 file:text-[#6E3BFF] hover:file:bg-[#6E3BFF]/20 cursor-pointer"
                    />
                  ) : (
                    <input
                      id={field.name}
                      type={field.type || "text"}
                      placeholder={field.placeholder || `Masukkan ${field.label.toLowerCase()}`}
                      value={formData[field.name] || ""}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-[#6E3BFF]/10 focus:border-[#6E3BFF] transition-all font-medium"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1" />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-white rounded-b-2xl shrink-0">
          <button 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="px-6 py-3 rounded-xl text-[14px] font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-6 py-3 rounded-xl text-[14px] font-bold text-white transition-colors shadow-sm flex items-center gap-2 ${
              isDelete 
                ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" 
                : "bg-[#6E3BFF] hover:bg-[#5C2EE6] shadow-[#6E3BFF]/20"
            } disabled:opacity-50`}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "create" && "Simpan Data"}
            {mode === "edit" && "Simpan Perubahan"}
            {mode === "delete" && "Ya, Hapus Data"}
          </button>
        </div>

      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #CBD5E1;
        }
      `}} />
    </div>
  );
}
