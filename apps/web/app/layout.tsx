import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/src/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Amni — ERP, set up in minutes",
  description:
    "Amni is the modern way to run your business: an isolated, full-featured ERP provisioned for your company in minutes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
