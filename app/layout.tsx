import type { Metadata } from "next";
import { Archivo, Figtree } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo" });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

export const metadata: Metadata = {
  title: "Coach | Fitness chat",
  description: "Chat with Coach about training, form and nutrition, and level up as you go.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${figtree.variable}`}>
      <body>{children}</body>
    </html>
  );
}
