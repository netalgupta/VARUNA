import type { Metadata } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VARUNA — National Marine Data Backbone & Ocean Intelligence",
  description:
    "Fusing INCOIS ARGO Physical Oceanography with CMLRE Marine Living Resources into an Agentic AI Operations Center.",
  keywords: ["VARUNA", "INCOIS", "CMLRE", "ARGO floats", "marine biodiversity", "oceanography", "marine heatwaves", "MoES"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="stylesheet" href="/cesium/Widgets/widgets.css" />
      </head>
      <body
        className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased bg-[#020B14] text-[#D6F6FF]`}
      >
        {children}
      </body>
    </html>
  );
}
