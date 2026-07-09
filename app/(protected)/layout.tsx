import { Sidebar } from "@/components/layouts/sidebar";
import { Header } from "@/components/layouts/header";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8F9FC] flex text-gray-900 font-sans selection:bg-[#531FFF]/20">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen min-w-0">
        <Header />
        <div className="flex-1 overflow-auto flex flex-col relative w-full h-full">
          <div className="flex-1 flex flex-col w-full h-full">
            {children}
          </div>
          <footer className="w-full px-8 py-6 flex items-center justify-between text-[11px] text-gray-400 font-medium">
            <p>© 2025 Smart School Operating System. All rights reserved.</p>
            <p>Versi 1.0.0</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
