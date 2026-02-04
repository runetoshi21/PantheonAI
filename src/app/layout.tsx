import type { Metadata } from "next";
import { IBM_Plex_Mono, Rajdhani } from "next/font/google";
import "./globals.css";

const display = Rajdhani({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const body = IBM_Plex_Mono({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Pantheon Liquidity Terminal",
  description:
    "Scan Solana liquidity across Raydium, Meteora, and PumpSwap with quant-grade visualization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
