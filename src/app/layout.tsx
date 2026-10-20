import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Providers } from "@/components/Providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Discount Koi · Sudbury deals, discounts & freebies",
    template: "%s · Discount Koi",
  },
  description:
    "Every deal, discount and freebie for Sudbury, Ontario, plus Ontario-wide deals. Updated every morning at 6 AM.",
  applicationName: "Discount Koi",
};

export const viewport: Viewport = {
  // `cover` lets the layout reach under the iPhone notch/home bar; safe-area padding keeps content clear.
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f2ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1517" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // next-themes edits the class on <html> before React hydrates, hence suppressHydrationWarning.
    <html lang="en-CA" className={`${geistSans.variable} antialiased`} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col">
        <Providers>
          <div aria-hidden="true" className="koi-backdrop" />
          <a
            href="#main"
            className="sr-only z-50 rounded-full glass-strong px-4 py-3 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
          >
            Skip to content
          </a>
          <Navbar />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
