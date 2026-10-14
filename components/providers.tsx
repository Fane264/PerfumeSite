"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "react-hot-toast";

/**
 * Client provider tree: react-query, nuqs (URL state) and the toast portal.
 * `ClerkProvider` stays in the server root layout above this.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>{children}</NuqsAdapter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#1A1A1A",
            color: "#F5F0E8",
            border: "1px solid #2A2A2A",
            borderRadius: "2px",
            fontSize: "0.875rem",
          },
          success: { iconTheme: { primary: "#C9A84C", secondary: "#0A0A0A" } },
          error: { iconTheme: { primary: "#8B3A3A", secondary: "#F5F0E8" } },
        }}
      />
    </QueryClientProvider>
  );
}
