"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div className="flex h-screen bg-[#F1F5F9] overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        side={isMobile ? "right" : "left"}
      />

      <main className="flex-1 overflow-y-auto pb-16 min-w-0">
        <div className="p-4 md:p-6 space-y-6">
          <Header title="Products" onMenuClick={() => setSidebarOpen(true)} />
          {children}
        </div>
      </main>

      <BottomNav onMenuClick={() => setSidebarOpen(true)} />
    </div>
  );
}
