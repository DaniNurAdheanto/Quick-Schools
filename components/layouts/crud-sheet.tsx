import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CrudField {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
}

interface CrudSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit" | "delete";
  entityName: string;
  fields: CrudField[];
  initialData?: any;
}

export function CrudSheet({
  open,
  onOpenChange,
  mode,
  entityName,
  fields,
  initialData
}: CrudSheetProps) {
  const isDelete = mode === "delete";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col bg-white">
        <SheetHeader>
          <SheetTitle className="text-xl font-bold">
            {mode === "create" && `Tambah ${entityName}`}
            {mode === "edit" && `Edit ${entityName}`}
            {mode === "delete" && `Hapus ${entityName}`}
          </SheetTitle>
          <SheetDescription>
            {isDelete
              ? `Apakah Anda yakin ingin menghapus data ${entityName} ini? Tindakan ini tidak dapat dibatalkan.`
              : `Silakan isi formulir di bawah ini untuk ${
                  mode === "create" ? "menambahkan" : "memperbarui"
                } data ${entityName}.`}
          </SheetDescription>
        </SheetHeader>

        {!isDelete ? (
          <div className="flex-1 py-6 space-y-6 overflow-y-auto hide-scrollbar">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name} className="text-sm font-semibold text-gray-700">
                  {field.label}
                </Label>
                <Input
                  id={field.name}
                  type={field.type || "text"}
                  placeholder={field.placeholder || `Masukkan ${field.label.toLowerCase()}`}
                  defaultValue={initialData?.[field.name] || ""}
                  className="rounded-xl border-gray-200 focus:ring-[#531FFF]/20 focus:border-[#531FFF]"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <SheetFooter className="border-t pt-4">
          <SheetClose render={<Button variant="outline" className="rounded-xl" />}>
            Batal
          </SheetClose>
          <Button
            className={`rounded-xl text-white ${
              isDelete ? "bg-red-500 hover:bg-red-600" : "bg-[#531FFF] hover:bg-[#531FFF]/90"
            }`}
            onClick={() => onOpenChange(false)}
          >
            {mode === "create" && "Simpan Data"}
            {mode === "edit" && "Simpan Perubahan"}
            {mode === "delete" && "Ya, Hapus Data"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
