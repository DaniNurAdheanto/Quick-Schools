import React from "react";

export function DataTable() {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 p-4 border-b border-gray-200 text-sm font-medium text-gray-500">
        Reusable Data Table (TanStack Table wrapper)
      </div>
      <div className="p-8 text-center text-sm text-gray-400 bg-white">
        No records found
      </div>
    </div>
  );
}
