// This file sets up the UI components using Shadcn, TanStack, and other libraries.
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/toaster';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div className="app-container">
        {children}
        <Toaster />
      </div>
    </ThemeProvider>
  );
}