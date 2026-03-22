"use client";

import { ThemeProvider } from "./theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./auth-provider";
import { CartProvider } from "@/stores/cart-context";
import { PermissionsProvider } from "@/stores/permissions-context";
import { UserStatusProvider } from "@/stores/user-status-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <PermissionsProvider>
          <UserStatusProvider>
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
          </UserStatusProvider>
        </PermissionsProvider>
      </CartProvider>
    </AuthProvider>
  );
}
