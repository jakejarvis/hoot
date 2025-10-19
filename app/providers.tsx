"use client";

import { AppProgressProvider as ProgressProvider } from "@bprogress/next";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      storageKey="theme"
      enableSystem
      disableTransitionOnChange
    >
      <ProgressProvider
        options={{ showSpinner: false }}
        shallowRouting
        disableStyle
      >
        {children}
      </ProgressProvider>
    </ThemeProvider>
  );
}
