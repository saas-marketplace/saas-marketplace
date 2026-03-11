import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import LayoutWithConditionalNavFooter from "@/components/providers/LayoutWithConditionalNavFooter";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "NexusHub - Premium Digital Services Marketplace",
  description:
    "Discover premium digital products, top-tier freelance talent, and everything you need to build your next project.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", inter.variable)}>
      <body className={inter.className}>
        <Providers>
          <LayoutWithConditionalNavFooter>{children}</LayoutWithConditionalNavFooter>
        </Providers>
      </body>
    </html>
  );
}