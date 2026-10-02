import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import LayoutWithConditionalNavFooter from "@/components/providers/LayoutWithConditionalNavFooter";
import { cn } from "@/lib/utils";
import { AccessBlocker } from "@/components/ui/access-blocker";

/**
 * Display face for the FRILANSIHA wordmark only. Sora is a geometric sans with
 * wide, confident letterforms — it matches the cyan/sky gradient theme better
 * than a roman serif would.
 */
const brandFont = Sora({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
  variable: "--font-brand",
});

export const metadata: Metadata = {
  title: "Frilansiha Company - Premium Digital Services Marketplace",
  description:
    "Discover premium digital products, top-tier freelance talent, and everything you need to build your next project.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", brandFont.variable)}>
      <body className={cn("bg-background text-foreground")}>
        <Providers>
          <AccessBlocker>
            <LayoutWithConditionalNavFooter>{children}</LayoutWithConditionalNavFooter>
          </AccessBlocker>
        </Providers>
      </body>
    </html>
  );
}
