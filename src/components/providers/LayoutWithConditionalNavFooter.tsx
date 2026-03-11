"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "../providers/layout/navbar";
import { Footer } from "../providers/layout/footer";

export default function LayoutWithConditionalNavFooter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard");
  return (
    <>
      {!isDashboard && <Navbar />}
      <main className={!isDashboard ? "min-h-screen pt-16" : undefined}>{children}</main>
      {!isDashboard && <Footer />}
    </>
  );
}
