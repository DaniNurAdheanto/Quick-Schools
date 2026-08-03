import React from 'react';
import { 
  X, 
  CalendarDays,
  ChevronDown,
  Sparkles,
  UploadCloud
} from 'lucide-react';

interface AddAgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddAgendaModal({ isOpen, onClose }: AddAgendaModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-[500px] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 relative">
        
        {/* Header */}
        <div className="relative p-6 text-center border-b border-gray-100 bg-[#FAFAFA] rounded-t-2xl shrink-0">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
          <h2 className="relative text-[20px] font-extrabold text-gray-900 mb-2">Tambah Agenda Akademik</h2>
          <p className="relative text-[13px] text-gray-400 font-medium px-4">
            Masukkan detail informasi untuk menambahkan agenda ke kalender akademik.
          </p>
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="space-y-6">
            
            {/* Task Name */}
            <div className="space-y-2">
              <label className="text-[14px] font-bold text-gray-800">Nama Agenda</label>
              <input 
                type="text" 
                placeholder="Contoh: Rapat Koordinasi Guru" 
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-[#6E3BFF]/10 focus:border-[#6E3BFF] transition-all font-medium" 
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <label className="text-[14px] font-bold text-gray-800">Tanggal & Waktu</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="dd/mm/yyyy" 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-[#6E3BFF]/10 focus:border-[#6E3BFF] transition-all font-medium" 
                />
                <CalendarDays className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Assign to */}
            <div className="space-y-2">
              <label className="text-[14px] font-bold text-gray-800">Pilih Penanggung Jawab</label>
              <div className="relative">
                <select 
                  defaultValue=""
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] text-gray-900 focus:outline-none focus:ring-4 focus:ring-[#6E3BFF]/10 focus:border-[#6E3BFF] transition-all appearance-none bg-white invalid:text-gray-400 font-medium"
                >
                  <option value="" disabled className="text-gray-400">Pilih User</option>
                  <option value="1">Admin Sekolah</option>
                  <option value="2">Guru BK</option>
                  <option value="3">Kepala Sekolah</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Priority & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[14px] font-bold text-gray-800">Prioritas</label>
                <div className="relative">
                  <select 
                    defaultValue=""
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] text-gray-900 focus:outline-none focus:ring-4 focus:ring-[#6E3BFF]/10 focus:border-[#6E3BFF] transition-all appearance-none bg-white font-medium"
                  >
                    <option value="" disabled>Pilih Prioritas</option>
                    <option value="high">Tinggi</option>
                    <option value="medium">Sedang</option>
                    <option value="low">Rendah</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[14px] font-bold text-gray-800">Status</label>
                <div className="relative">
                  <select 
                    defaultValue=""
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] text-gray-900 focus:outline-none focus:ring-4 focus:ring-[#6E3BFF]/10 focus:border-[#6E3BFF] transition-all appearance-none bg-white font-medium"
                  >
                    <option value="" disabled>Pilih Status</option>
                    <option value="draft">Draft</option>
                    <option value="published">Diumumkan</option>
                    <option value="completed">Selesai</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-[14px] font-bold text-gray-800">Keterangan</label>
              <div className="relative border border-gray-200 rounded-xl focus-within:ring-4 focus-within:ring-[#6E3BFF]/10 focus-within:border-[#6E3BFF] transition-all overflow-hidden bg-white">
                <textarea 
                  placeholder="Tulis keterangan di sini..." 
                  className="w-full px-4 py-3 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none resize-none min-h-[140px] font-medium"
                ></textarea>
                <div className="absolute bottom-3 left-3">
                  <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-[13px] font-bold bg-gradient-to-r from-[#F28241] via-[#D1559C] to-[#8C3BEA] hover:opacity-90 transition-opacity shadow-sm">
                    Generate with AI
                    <Sparkles className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            </div>

            {/* Attachment */}
            <div className="space-y-2">
              <label className="text-[14px] font-bold text-gray-800">Lampiran</label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-[#F9FAFB] hover:bg-gray-50 hover:border-[#6E3BFF]/50 transition-colors cursor-pointer group">
                <UploadCloud className="w-6 h-6 text-gray-400 mb-2 group-hover:text-[#6E3BFF] transition-colors" />
                <p className="text-[14px] font-bold text-gray-700 mb-1">
                  <span className="text-[#6E3BFF]">Klik untuk unggah</span> atau seret dan lepas
                </p>
                <p className="text-[12px] text-gray-400 max-w-[280px] leading-relaxed font-medium">
                  PDF, DOC kurang dari 5MB. Pastikan dokumen dalam kondisi baik dan dapat dibaca.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-white rounded-b-2xl shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-3 rounded-xl text-[14px] font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button 
            onClick={onClose}
            className="px-6 py-3 rounded-xl text-[14px] font-bold text-white bg-[#6E3BFF] hover:bg-[#5C2EE6] transition-colors shadow-sm shadow-[#6E3BFF]/20"
          >
            Simpan Agenda
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
