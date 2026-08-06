const fs = require('fs');
const p = '/app/applet/app/(protected)/admin/attendance/page.tsx';
let data = fs.readFileSync(p, 'utf8');

// 1. Add Download to lucide-react import
if (!data.includes('Download') && data.includes('lucide-react')) {
    data = data.replace('MoreVertical, RefreshCcw, List', 'MoreVertical, RefreshCcw, List, Download');
}

// 2. Add handleExportCSV logic
const exportLogic = `
  const handleExportCSV = () => {
    const headers = ["ID Presensi", "Nama Siswa", "NISN", "Kelas", "Waktu", "Tanggal", "Status", "Lokasi Lintang", "Lokasi Bujur", "Dalam Radius"];
    const csvContent = [
      headers.join(","),
      ...filteredData.map(row => 
        [
          row.id, 
          "\\"" + row.studentName + "\\"", 
          row.studentId, 
          "\\"" + row.className + "\\"", 
          row.timestamp, 
          "\\"" + row.date + "\\"", 
          "\\"" + row.status + "\\"", 
          row.location.lat, 
          row.location.lng, 
          row.location.inRadius ? "Ya" : "Tidak"
        ].join(",")
      )
    ].join("\\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", \`Laporan_Presensi_\${new Date().toISOString().split('T')[0]}.csv\`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
`;

if (!data.includes('handleExportCSV')) {
    data = data.replace('return (', exportLogic + '\n  return (');
}

// 3. Add Export button
const targetButtonBlock = `<div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm">
            <RefreshCcw className="w-4 h-4" />
            Sinkronisasi Data
          </button>`;
const newButtonBlock = `<div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm"
          >
            <Download className="w-4 h-4" />
            Ekspor CSV
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm">
            <RefreshCcw className="w-4 h-4" />
            Sinkronisasi Data
          </button>`;

if (data.includes('<div className="flex items-center gap-3">') && !data.includes('Ekspor CSV')) {
    data = data.replace(targetButtonBlock, newButtonBlock);
}

fs.writeFileSync(p, data);
