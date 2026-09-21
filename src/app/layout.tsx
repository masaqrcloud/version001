import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import "./globals.css";
import { THEME_BOOT_SCRIPT } from "@/components/theme-toggle";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "MasaQR",
  description: "Kafe ve restoran işletmeleri için dijital menü ve masa sipariş yönetimi",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/masaqr-icon.svg", apple: "/masaqr-icon.svg" },
  appleWebApp: {
    capable: true,
    title: "MasaQR",
    statusBarStyle: "default",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e54b32" },
    { media: "(prefers-color-scheme: dark)", color: "#16110f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${manrope.variable} ${newsreader.variable} h-full scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <div className="app-root">{children}</div>
      </body>
    </html>
  );
}
