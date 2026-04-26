"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";

export default function CategoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#F1F5F9] overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="p-4 md:p-6 space-y-6">
          <Header title="Categories" onMenuClick={() => setSidebarOpen(true)} />
          {children}
        </div>
      </main>

      <BottomNav onMenuClick={() => setSidebarOpen(true)} />
    </div>
  );
}
