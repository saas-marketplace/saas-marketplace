"use client";

import { cn } from "@/lib/utils";

interface GradientBlobProps {
  className?: string;
}

export function GradientBlob({ className }: GradientBlobProps) {
  return (
    <div className={cn("absolute pointer-events-none", className)}>
      <div className="absolute top-0 -left-4 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob dark:opacity-10" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000 dark:opacity-10" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000 dark:opacity-10" />
    </div>
  );
}