import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppFooter } from "@/components/app-footer";
import { AppHeader } from "@/components/app-header";
import { ThemeProvider } from "@/components/theme-provider";
import { TRPCProvider } from "@/components/trpc-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hoot — Domain Intelligence Made Easy",
  description: "Investigate domains with WHOIS, DNS, SSL, headers, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased slashed-zero tabular-nums selection:bg-[#6a6a6a] selection:text-white`}
      >
        <ThemeProvider>
          {/* Solid background for light/dark modes */}
          <div aria-hidden className="fixed inset-0 -z-10 bg-background" />

          {/* App Shell */}
          <TRPCProvider>
            <div className="min-h-svh flex flex-col">
              <AppHeader />
              <main className="flex-1 min-h-0 flex flex-col">{children}</main>
              <AppFooter />
            </div>
          </TRPCProvider>
          <Toaster richColors closeButton />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
