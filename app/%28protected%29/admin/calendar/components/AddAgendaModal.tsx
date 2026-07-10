import React, { useState } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal,
  Bell,
  Sun,
  User,
  CalendarDays,
  FolderOpen,
  Flag,
  AlignLeft,
  ListTodo,
  MessageSquare,
  Paperclip,
  Send,
  MapPin,
  CheckCircle2,
  Plus
} from 'lucide-react';

interface AddAgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddAgendaModal({ isOpen, onClose }: AddAgendaModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-[700px] max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 rounded-t-2xl">
          <h2 className="text-[15px] font-bold text-gray-900">Tambah Agenda Akademik</h2>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3 text-sm text-gray-500 font-medium">
              <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 flex flex-col gap-8">
          
          {/* Title Area */}
          <div className="flex items-start justify-between gap-4">
            <input 
              type="text" 
              placeholder="Masukkan Judul Agenda..." 
              className="text-2xl md:text-3xl font-bold text-gray-900 placeholder:text-gray-300 w-full outline-none border-none bg-transparent focus:ring-0 p-0"
              autoFocus
            />
            <div className="flex items-center gap-2 shrink-0">
              <button className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
                <Bell className="w-4 h-4" />
              </button>
              <button className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Properties */}
          <div className="flex flex-col gap-4">
            
            {/* Status */}
            <div className="flex items-center">
              <div className="w-32 md:w-40 flex items-center gap-2 text-[13px] font-medium text-gray-500">
                <Sun className="w-4 h-4" />
                Status
              </div>
              <div className="flex-1">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[13px] font-bold transition-colors">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  Draft
                </button>
              </div>
            </div>

            {/* Created By */}
            <div className="flex items-center">
              <div className="w-32 md:w-40 flex items-center gap-2 text-[13px] font-medium text-gray-500">
                <User className="w-4 h-4" />
                Dibuat oleh
              </div>
              <div className="flex-1 flex items-center gap-2 text-[13px] font-medium text-gray-900">
                <div className="w-6 h-6 rounded-full bg-[#531FFF] text-white flex items-center justify-center text-[10px] font-bold">
                  A
                </div>
                Admin Sekolah
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-center">
              <div className="w-32 md:w-40 flex items-center gap-2 text-[13px] font-medium text-gray-500">
                <CalendarDays className="w-4 h-4" />
                Tanggal & Waktu
              </div>
              <div className="flex-1">
                <input 
                  type="text" 
                  placeholder="Pilih Tanggal..." 
                  className="w-full text-[13px] font-medium text-gray-900 placeholder:text-gray-400 outline-none hover:bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 border border-transparent focus:border-blue-200 rounded-md px-2 py-1 -ml-2 transition-all"
                />
              </div>
            </div>

            {/* Category */}
            <div className="flex items-center">
              <div className="w-32 md:w-40 flex items-center gap-2 text-[13px] font-medium text-gray-500">
                <FolderOpen className="w-4 h-4" />
                Kategori
              </div>
              <div className="flex-1 text-[13px] font-medium text-gray-900">
                <input 
                  type="text" 
                  placeholder="Cth: Akademik, Event Sekolah" 
                  className="w-full text-[13px] font-medium text-gray-900 placeholder:text-gray-400 outline-none hover:bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 border border-transparent focus:border-blue-200 rounded-md px-2 py-1 -ml-2 transition-all"
                />
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center">
              <div className="w-32 md:w-40 flex items-center gap-2 text-[13px] font-medium text-gray-500">
                <MapPin className="w-4 h-4" />
                Lokasi
              </div>
              <div className="flex-1 text-[13px] font-medium text-gray-900">
                <input 
                  type="text" 
                  placeholder="Lokasi Kegiatan" 
                  className="w-full text-[13px] font-medium text-gray-900 placeholder:text-gray-400 outline-none hover:bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 border border-transparent focus:border-blue-200 rounded-md px-2 py-1 -ml-2 transition-all"
                />
              </div>
            </div>

            {/* Priority */}
            <div className="flex items-center">
              <div className="w-32 md:w-40 flex items-center gap-2 text-[13px] font-medium text-gray-500">
                <Flag className="w-4 h-4" />
                Prioritas
              </div>
              <div className="flex-1">
                <button className="flex items-center gap-2 px-2.5 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-md text-[12px] font-bold transition-colors">
                  <Flag className="w-3 h-3 text-green-600 fill-green-600" />
                  Normal
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="flex items-start pt-2">
              <div className="w-32 md:w-40 flex items-center gap-2 text-[13px] font-medium text-gray-500 pt-1">
                <AlignLeft className="w-4 h-4" />
                Keterangan
              </div>
              <div className="flex-1">
                <textarea 
                  placeholder="Tambahkan deskripsi atau detail agenda..."
                  className="w-full text-[13px] text-gray-700 placeholder:text-gray-400 outline-none hover:bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 border border-transparent focus:border-blue-200 rounded-md px-2 py-1.5 -ml-2 transition-all min-h-[60px] resize-none"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Sub Task / Rincian Kegiatan */}
          <div className="space-y-4">
            <h3 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
              <ListTodo className="w-4 h-4" />
              Rincian Kegiatan (Sub-Agenda)
            </h3>
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-6 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center shadow-sm">
                <ListTodo className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-gray-900 mb-0.5">Belum ada rincian kegiatan</p>
                <p className="text-[12px] text-gray-500">Tambahkan rincian untuk memecah agenda menjadi lebih detail!</p>
              </div>
              <button className="mt-2 flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                <Plus className="w-4 h-4" />
                Tambah Rincian
              </button>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Comments / Catatan Tambahan */}
          <div className="space-y-4">
            <h3 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Catatan & Diskusi
            </h3>
            
            <div className="flex items-center gap-2 p-1 border border-gray-200 rounded-xl focus-within:border-[#531FFF] focus-within:ring-1 focus-within:ring-[#531FFF] transition-all bg-white">
              <input 
                type="text" 
                placeholder="Tulis catatan..." 
                className="flex-1 text-[13px] placeholder:text-gray-400 bg-transparent outline-none px-3 py-1.5"
              />
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                <Paperclip className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-400 hover:text-[#531FFF] rounded-lg transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Example Comment (Optional, maybe hidden for "Add" mode, but good for design reference) */}
            {/* <div className="pt-2 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[10px] font-bold">
                      G
                    </div>
                    <span className="text-[12px] font-bold text-gray-900">Guru Staff</span>
                    <span className="text-[11px] text-gray-500">Baru saja</span>
                  </div>
                  <p className="text-[13px] text-gray-700 pl-7">
                    Jangan lupa siapkan perlengkapan sound system untuk acara ini.
                  </p>
                </div>
              </div>
            </div> */}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Batal
            </button>
            <button 
              onClick={onClose}
              className="px-5 py-2.5 bg-[#531FFF] text-white rounded-xl text-[13px] font-semibold hover:bg-[#531FFF]/90 shadow-sm transition-all"
            >
              Simpan Agenda
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
