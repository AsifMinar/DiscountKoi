import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Providers } from "@/components/Providers";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, pageMetadata } from "@/lib/metadata";
import { SITE_ORIGIN } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Makes link-preview and canonical URLs absolute (https://asifminar.github.io/DiscountKoi/…).
  metadataBase: new URL(SITE_ORIGIN),
  ...pageMetadata({ description: DEFAULT_DESCRIPTION, path: "" }),
  title: { default: DEFAULT_TITLE, template: "%s · Discount Koi" },
  applicationName: "Discount Koi",
  appleWebApp: { capable: true, title: "Discount Koi", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  // Other sites see only "asifminar.github.io", never which page or search you came from.
  referrer: "strict-origin-when-cross-origin",
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
          <main id="main" className="flex-1 px-page">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
