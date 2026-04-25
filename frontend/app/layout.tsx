import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import AICopilotMount from "@/components/ai/AICopilotMount";
import { SonnerProvider } from "@/components/providers/SonnerProvider";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CareQueue AI — Real-time Queue Management",
  description:
    "Uber-style real-time clinic queue management. Join the queue, track your turn, and get AI-powered clinic recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`relative min-h-full flex flex-col antialiased ${sora.variable} ${manrope.variable}`}
      >
        <div aria-hidden className="global-ambient">
          <div className="global-ambient__blob global-ambient__blob--one" />
          <div className="global-ambient__blob global-ambient__blob--two" />
          <div className="global-ambient__blob global-ambient__blob--three" />
          <div className="global-ambient__mesh" />
        </div>
        {children}
        <SonnerProvider />
        <AICopilotMount />
      </body>
    </html>
  );
}
