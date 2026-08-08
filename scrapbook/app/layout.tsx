import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Caveat, Special_Elite } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const specialElite = Special_Elite({
  variable: "--font-special-elite",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Our Scrapbook",
  description: "A collaborative digital scrapbook — paste in a photo, everyone sees it.",
};

export const viewport: Viewport = {
  themeColor: "#c1a06b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${caveat.variable} ${specialElite.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
