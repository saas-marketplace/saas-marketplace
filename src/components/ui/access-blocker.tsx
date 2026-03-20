"use client";

// AccessBlocker wraps children and handles access control on the client side
// Note: The dashboard layout now handles server-side redirects instead
export function AccessBlocker({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// Kept for backwards compatibility
export function AccessRemovedScreen() {
  return null;
}
