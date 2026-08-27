import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // taste-skill: The LILA BAN. Neutral base. ONE accent.
        zinc: {
          950: "#09090b",
        },
        accent: {
          DEFAULT: "#10b981",   // emerald-500
          dim:     "#064e3b",   // emerald-950
          bright:  "#34d399",   // emerald-400
        },

        // Keep for chart compatibility — but UI uses zinc only
        argo: {
          cyan:    "#10b981",   // remapped to emerald
          blue:    "#6ee7b7",
          gold:    "#fbbf24",
          orange:  "#f97316",
        },
        deep:    "#09090b",
        ocean:   "#111113",
        abyss:   "#05050a",
        surface: "#18181b",
        "text-main":  "#f4f4f5",
        "text-muted": "#a1a1aa",
        "text-dark":  "#09090b",
      },

      fontFamily: {
        sans:    ["var(--font-inter)", "system-ui", "sans-serif"],
        mono:    ["var(--font-jetbrains-mono)", "monospace"],
        display: ["var(--font-outfit)", "var(--font-inter)", "sans-serif"],
      },

      borderColor: {
        DEFAULT: "rgba(255,255,255,0.06)",
      },

      animation: {
        "ping-slow":    "ping 3s cubic-bezier(0,0,0.2,1) infinite",
        "float":        "float 6s ease-in-out infinite",
        "shimmer":      "shimmer 1.8s ease-in-out infinite",
        "marquee":      "marquee 28s linear infinite",
        "accent-pulse": "accentPulse 2.4s ease-in-out infinite",
        "fade-up":      "fadeUp 0.4s ease forwards",
      },

      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-8px)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },

      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config;
