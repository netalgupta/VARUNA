import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Varuna — Ocean Intelligence & Data Platform",
  description:
    "National Marine Data Backbone fusing INCOIS ARGO Physical Oceanography with CMLRE Marine Living Resources.",
  keywords: ["Varuna", "INCOIS", "CMLRE", "ARGO floats", "marine biodiversity", "oceanography", "MoES"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-[#060c18] text-[#f8fafc] selection:bg-sky-500 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
