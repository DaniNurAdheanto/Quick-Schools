"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Edit3, User, Info, AlertTriangle } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

export interface CrudField {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

export interface CrudSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit" | "delete" | "view";
  entityName: string;
  fields: CrudField[];
  initialData?: any;
  onSubmit?: (data: any) => Promise<void> | void;
  onDataChange?: (data: any) => void;
  onEditRequested?: () => void;
}

export function CrudSheet({
  open,
  onOpenChange,
  mode,
  entityName,
  fields,
  initialData,
  onSubmit,
  onDataChange,
  onEditRequested
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
  const isView = mode === "view";

  const getTitle = () => {
    if (mode === "create") return `Tambah ${entityName}`;
    if (mode === "edit") return `Edit ${entityName}`;
    if (mode === "delete") return `Hapus ${entityName}`;
    if (mode === "view") return `Detail ${entityName}`;
    return "";
  };

  const getDescription = () => {
    if (isDelete) return `Menghapus data ini juga akan menghapus akun pengguna terkait secara permanen dari sistem.`;
    if (isView) return `Informasi detail data ${entityName} yang tersimpan dalam sistem.`;
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

  // Helper to format field values in View mode
  const renderFormattedValue = (field: CrudField, rawValue: any) => {
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      return <span className="text-gray-400 italic text-[13px]">- Tidak Diisi -</span>;
    }

    if (field.type === "select" && field.options) {
      const found = field.options.find(opt => opt.value === String(rawValue));
      if (found) {
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-[#531FFF] border border-purple-100 rounded-lg font-bold text-[13px]">
            {found.label}
          </span>
        );
      }
    }

    if (typeof rawValue === "boolean") {
      return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${rawValue ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>
          {rawValue ? "Aktif" : "Non-Aktif"}
        </span>
      );
    }

    return <span className="text-gray-900 font-semibold text-[14px] leading-relaxed break-words">{String(rawValue)}</span>;
  };

  // Header display name / avatar logic for view mode
  const primaryTitle = initialData?.name || initialData?.title || initialData?.studentName || initialData?.teacherName || initialData?.code || entityName;
  const secondarySubtitle = initialData?.nis || initialData?.nip || initialData?.category || initialData?.grade || initialData?.code || initialData?.email;
  const photoUrl = initialData?.photoUrl || initialData?.avatar || initialData?.image;

  return (
    <div className={cn(
      "fixed inset-0 z-50 p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200 flex",
      isDelete ? "items-center justify-center" : "justify-end"
    )}>
      <div className={cn(
        "bg-white rounded-3xl w-full shadow-2xl flex flex-col relative overflow-hidden border border-gray-100",
        isDelete 
          ? "max-w-[440px] h-auto max-h-[90vh] animate-in zoom-in-95 duration-200" 
          : "max-w-[520px] h-full animate-in slide-in-from-right duration-300"
      )}>
        
        {/* Header */}
        <div className={cn(
          "relative p-6 text-center border-b border-gray-100 shrink-0 rounded-t-3xl",
          isView ? "bg-gradient-to-b from-[#F7F5FF] to-white" : isDelete ? "bg-rose-50/60" : "bg-[#FAFAFA]"
        )}>
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
          
          <button 
            onClick={() => onOpenChange(false)} 
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>

          {isDelete ? (
            <div className="pt-2 pb-1 flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3 shadow-sm border border-rose-200">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h2 className="text-[20px] font-extrabold text-gray-900 tracking-tight">{getTitle()}</h2>
              <p className="text-[13px] text-rose-600 font-semibold mt-1 px-4 leading-relaxed">
                {getDescription()}
              </p>
            </div>
          ) : isView ? (
            <div className="pt-2 pb-1 flex flex-col items-center">
              {photoUrl ? (
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white shadow-lg mb-3 shrink-0 bg-gray-100">
                  <img src={photoUrl} alt={primaryTitle} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#531FFF] to-[#7B42FF] text-white flex items-center justify-center font-bold text-2xl shadow-md shadow-[#531FFF]/20 mb-3 shrink-0">
                  {primaryTitle ? primaryTitle.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
                </div>
              )}
              <h2 className="text-[20px] font-extrabold text-gray-900 tracking-tight">{primaryTitle}</h2>
              {secondarySubtitle && (
                <p className="text-[13px] text-[#531FFF] font-bold mt-0.5 px-3 py-0.5 bg-[#531FFF]/10 rounded-full inline-block">
                  {secondarySubtitle}
                </p>
              )}
            </div>
          ) : (
            <>
              <h2 className="relative text-[20px] font-extrabold text-gray-900 mb-1">{getTitle()}</h2>
              <p className="relative text-[13px] text-gray-500 font-medium px-4">
                {getDescription()}
              </p>
            </>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {isView ? (
            /* VIEW MODE: Modern card view with NO text inputs! */
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#531FFF]" /> Ringkasan Informasi
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Terverifikasi
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {fields.map((field) => {
                  if (field.type === "file" || field.name === "photoUrl" || field.name === "avatar") return null;
                  const value = initialData ? initialData[field.name] : formData[field.name];

                  return (
                    <div 
                      key={field.name}
                      className="bg-gray-50/80 hover:bg-gray-50 border border-gray-100 hover:border-purple-100 rounded-2xl p-4 transition-all"
                    >
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        {field.label}
                      </div>
                      <div>
                        {renderFormattedValue(field, value)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : !isDelete ? (
            /* EDIT / CREATE MODE: Standard Form Inputs */
            <div className="space-y-5">
              {fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <label className="text-[14px] font-bold text-gray-800">{field.label}</label>
                  {field.type === "select" ? (
                    <select
                      id={field.name}
                      value={formData[field.name] || ""}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] text-gray-900 focus:outline-none focus:ring-4 focus:ring-[#531FFF]/10 focus:border-[#531FFF] transition-all font-medium appearance-none bg-white"
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
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] text-gray-900 focus:outline-none focus:ring-4 focus:ring-[#531FFF]/10 focus:border-[#531FFF] transition-all font-medium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#531FFF]/10 file:text-[#531FFF] hover:file:bg-[#531FFF]/20 cursor-pointer"
                    />
                  ) : (
                    <input
                      id={field.name}
                      type={field.type || "text"}
                      placeholder={field.placeholder || `Masukkan ${field.label.toLowerCase()}`}
                      value={formData[field.name] || ""}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-[#531FFF]/10 focus:border-[#531FFF] transition-all font-medium"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-3 px-1 space-y-4">
              <div className="p-4 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-start gap-3 text-left">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-rose-900">Perhatian Penting!</h4>
                  <p className="text-xs font-medium text-rose-700 leading-relaxed">
                    Menghapus data <strong>{primaryTitle}</strong> akan secara otomatis <strong>menghapus akun pengguna (hak akses login) & seluruh profil siswa/guru</strong> yang bersangkutan dari database sistem.
                  </p>
                </div>
              </div>
              <p className="text-center text-xs font-semibold text-gray-400">
                Seluruh riwayat data terhapus secara permanen dan tidak dapat dikembalikan.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-white rounded-b-3xl shrink-0">
          {isView ? (
            <>
              <button 
                onClick={() => onOpenChange(false)}
                className="px-6 py-3 rounded-xl text-[14px] font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Tutup
              </button>
              {onEditRequested && (
                <button 
                  onClick={() => {
                    onOpenChange(false);
                    onEditRequested();
                  }}
                  className="px-6 py-3 rounded-xl text-[14px] font-bold text-white bg-[#531FFF] hover:bg-[#4316CC] shadow-md shadow-[#531FFF]/20 transition-all flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Data
                </button>
              )}
            </>
          ) : isDelete ? (
            <div className="grid grid-cols-2 gap-3 w-full">
              <button 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl text-[14px] font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl text-[14px] font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Ya, Hapus Data
              </button>
            </div>
          ) : (
            <>
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
                className="px-6 py-3 rounded-xl text-[14px] font-bold text-white bg-[#531FFF] hover:bg-[#4316CC] shadow-md shadow-[#531FFF]/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === "create" && "Simpan Data"}
                {mode === "edit" && "Simpan Perubahan"}
              </button>
            </>
          )}
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
