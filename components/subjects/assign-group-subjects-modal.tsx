"use client";

import React, { useState } from "react";
import {
  X,
  Search,
  FolderKanban,
  Save
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubjectGroup } from "@/lib/subject-groups";

interface AssignGroupSubjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: SubjectGroup | null;
  availableSubjects: any[];
  onSave: (groupId: string, updatedSubjectIds: string[]) => Promise<void>;
}

export function AssignGroupSubjectsModal({
  isOpen,
  onClose,
  group,
  availableSubjects,
  onSave,
}: AssignGroupSubjectsModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (group) {
      setSelectedIds(Array.isArray(group.subjectIds) ? [...group.subjectIds] : []);
    } else {
      setSelectedIds([]);
    }
    setSearchQuery("");
  }, [group, isOpen]);

  if (!isOpen || !group) return null;

  const filteredSubjects = availableSubjects.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (s.name || "").toLowerCase().includes(q) ||
      (s.code || "").toLowerCase().includes(q) ||
      (s.teacher || "").toLowerCase().includes(q)
    );
  });

  const isSubChecked = (sub: any) => {
    return (
      (sub._firestoreId && selectedIds.includes(sub._firestoreId)) ||
      (sub.code && selectedIds.includes(sub.code)) ||
      (sub.id && selectedIds.includes(sub.id))
    );
  };

  const handleToggleSubject = (sub: any) => {
    const checked = isSubChecked(sub);
    const keysToRemove = new Set([sub._firestoreId, sub.code, sub.id].filter(Boolean));
    if (checked) {
      setSelectedIds((prev) => prev.filter((id) => !keysToRemove.has(id)));
    } else {
      const keysToAdd = [sub._firestoreId, sub.id, sub.code].filter(Boolean);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...keysToAdd])));
    }
  };

  const handleSelectAll = () => {
    const allFilteredKeys: string[] = [];
    filteredSubjects.forEach((s) => {
      if (s._firestoreId) allFilteredKeys.push(s._firestoreId);
      if (s.id) allFilteredKeys.push(s.id);
      if (s.code) allFilteredKeys.push(s.code);
    });
    setSelectedIds((prev) => Array.from(new Set([...prev, ...allFilteredKeys])));
  };

  const handleDeselectAll = () => {
    const keysToRemove = new Set<string>();
    filteredSubjects.forEach((s) => {
      if (s._firestoreId) keysToRemove.add(s._firestoreId);
      if (s.id) keysToRemove.add(s.id);
      if (s.code) keysToRemove.add(s.code);
    });
    setSelectedIds((prev) => prev.filter((id) => !keysToRemove.has(id)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(group.id, selectedIds);
      onClose();
    } catch (err) {
      console.error("Save assigned subjects error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-50 via-white to-indigo-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#531FFF] text-white flex items-center justify-center shadow-md shadow-[#531FFF]/20">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-gray-900 leading-tight">
                  Kelola Mata Pelajaran
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-100 text-[#531FFF]">
                  {group.code}
                </span>
              </div>
              <p className="text-xs text-gray-500 line-clamp-1">
                {group.name} • {group.major}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search & Select All */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari mapel atau kode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2.5 py-1 text-gray-600 hover:text-[#531FFF] hover:bg-purple-50 rounded-lg font-bold transition-colors cursor-pointer"
            >
              Pilih Semua
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-2.5 py-1 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg font-bold transition-colors cursor-pointer"
            >
              Kosongkan
            </button>
          </div>
        </div>

        {/* Subjects List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-gray-100 custom-scrollbar">
          {filteredSubjects.length > 0 ? (
            filteredSubjects.map((sub) => {
              const subKey = sub._firestoreId || sub.code || sub.id;
              const isChecked = isSubChecked(sub);
              return (
                <label
                  key={subKey}
                  className={cn(
                    "flex items-center justify-between py-2.5 px-3 rounded-xl cursor-pointer transition-all",
                    isChecked ? "bg-purple-50/80 text-[#531FFF]" : "hover:bg-gray-50 text-gray-800"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleSubject(sub)}
                      className="rounded border-gray-300 text-[#531FFF] focus:ring-[#531FFF] cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs truncate text-gray-900">
                          {sub.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white border border-gray-200 text-gray-500 font-bold shrink-0">
                          {sub.code}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">
                        {sub.teacher && sub.teacher !== "-" ? `Guru: ${sub.teacher}` : "Belum ada guru"} • {sub.creditHours || "3 JP"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "text-[9px] font-extrabold px-2 py-0.5 rounded-full border",
                      sub.category === "Wajib" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-purple-50 text-purple-700 border-purple-100"
                    )}>
                      {sub.category || "Wajib"}
                    </span>
                  </div>
                </label>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-gray-400">
              Tidak ada mata pelajaran yang cocok dengan pencarian.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between text-xs">
          <span className="font-bold text-gray-500">
            Terpilih: <strong className="text-gray-900">{selectedIds.length}</strong> mapel
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-[#531FFF] hover:bg-[#4314cc] rounded-xl shadow-md shadow-[#531FFF]/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "Menyimpan..." : "Terapkan ke Kelompok"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
