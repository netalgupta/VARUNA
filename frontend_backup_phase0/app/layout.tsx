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
  title: "FloatChat AI — Ocean Intelligence",
  description:
    "Research-grade platform for ARGO oceanic float data analysis. Powered by local LLM inference.",
  keywords: ["ARGO floats", "ocean data", "AI analysis", "oceanography"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {/* Subtle ambient — not a blob, just atmosphere */}
        <div className="fixed inset-0 z-[-1] bg-zinc-950 pointer-events-none">
          {/* Single muted teal smear — not neon, not purple */}
          <div
            className="absolute top-0 right-0 w-[60%] h-[50%] opacity-[0.04]"
            style={{
              background:
                "radial-gradient(ellipse at 80% 20%, #10b981 0%, transparent 70%)",
            }}
          />
          {/* Bottom left depth shadow */}
          <div
            className="absolute bottom-0 left-0 w-[40%] h-[40%] opacity-[0.03]"
            style={{
              background:
                "radial-gradient(ellipse at 20% 80%, #6ee7b7 0%, transparent 70%)",
            }}
          />
        </div>
        {children}
      </body>
    </html>
  );
}
