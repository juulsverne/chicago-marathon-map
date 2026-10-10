import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import localFont from "next/font/local";
import { SITE } from "@/lib/site";
import "./globals.css";

// Big Shoulders is bundled (the latin file with both the wght and opsz axes from @fontsource-variable/big-shoulders,
// OFL license beside it) because next/font/google has no size-adjust metrics for it, so it could not generate a
// layout-stable fallback. globals.css pins the optical size to 72, the Big Shoulders Display design.
const display = localFont({
  src: "./fonts/BigShoulders-latin-opsz-wght.woff2",
  weight: "100 900",
  variable: "--font-display-face",
  display: "swap",
  adjustFontFallback: "Arial",
});
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans-face", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: "400", variable: "--font-mono-face", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.origin),
  title: SITE.title,
  description: SITE.description,
  robots: { index: false, follow: true },
  alternates: { canonical: SITE.url },
  openGraph: {
    type: "website",
    url: SITE.url,
    title: SITE.title,
    description: SITE.description,
    images: [{ url: SITE.ogImage, width: 1200, height: 630, alt: SITE.ogImageAlt }],
  },
  twitter: { card: "summary_large_image", title: SITE.title, description: SITE.description, images: [SITE.ogImage] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
  themeColor: SITE.themeColor,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
