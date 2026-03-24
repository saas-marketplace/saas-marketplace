"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "../providers/layout/navbar";
import { Footer } from "../providers/layout/footer";

export default function LayoutWithConditionalNavFooter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard");
  
  // Routes that should NOT show navbar/footer (full-screen standalone pages)
  const hideLayoutRoutes = [
    "/access-restored",
    "/access-removed",
    "/dashboard",
    "/banned"
  ];
  const isStandalonePage = hideLayoutRoutes.some(route => pathname === route);
  
  return (
    <>
      {!isDashboard && !isStandalonePage && <Navbar />}
      <main className={!isDashboard && !isStandalonePage ? "min-h-screen pt-16" : "min-h-screen"}>{children}</main>
      {!isDashboard && !isStandalonePage && <Footer />}
    </>
  );
}
