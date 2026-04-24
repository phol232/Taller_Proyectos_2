import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import SessionExpiredDialog from "@/components/shared/SessionExpiredDialog";
import { I18nProvider } from "@/lib/i18n";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Planner UC",
  description: "Sistema de Generación Óptima de Horarios Académicos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
      style={
        {
          "--font-geist-sans": '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
          "--font-geist-mono": '"SFMono-Regular", Menlo, Monaco, "Courier New", monospace',
        } as CSSProperties
      }
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-pure-white text-vercel-black dark:bg-[#0a0a0a] dark:text-gray-100">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <I18nProvider>
            {children}
            <SessionExpiredDialog />
            <Toaster richColors closeButton position="bottom-right" expand visibleToasts={5} />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
