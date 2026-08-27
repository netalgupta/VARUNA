import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Outfit, Plus_Jakarta_Sans } from "next/font/google";
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
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Varuna — Ocean Intelligence & Data Platform",
  description:
    "National Marine Data Backbone fusing INCOIS ARGO Physical Oceanography with CMLRE Marine Living Resources.",
  keywords: ["Varuna", "INCOIS", "CMLRE", "ARGO floats", "marine biodiversity", "oceanography", "MoES"],
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
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
        className={`${inter.variable} ${jetbrainsMono.variable} ${outfit.variable} ${plusJakartaSans.variable} font-sans antialiased bg-[#060c18] text-[#f8fafc] selection:bg-sky-500 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
