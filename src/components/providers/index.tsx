"use client";

import { ThemeProvider } from "./theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./auth-provider";
import { CartProvider } from "@/stores/cart-context";
import { PermissionsProvider } from "@/stores/permissions-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <PermissionsProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            storageKey="nexushub-theme"
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </PermissionsProvider>
      </CartProvider>
    </AuthProvider>
  );
}
