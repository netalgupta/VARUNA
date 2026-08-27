import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Marine dark theme tokens
        zinc: {
          950: "#09090b",
        },
        accent: {
          DEFAULT: "#2EE6C6",   // VARUNA Tropical Aqua / Emerald
          dim:     "#0D5C52",
          bright:  "#5CF5DA",
        },
        glow:      "#2EE6C6",
        coral:     "#FF7F50",   // Marine heatwave alert color
        warning:   "#F59E0B",
        danger:    "#EF4444",

        // Scientific chart compatibility
        argo: {
          cyan:    "#2EE6C6",
          blue:    "#38BDF8",
          gold:    "#FBBF24",
          orange:  "#F97316",
        },
        bg:        "#040914",   // Deep Abyssal Navy
        deep:      "#06101E",
        ocean:     "#09182E",
        abyss:     "#03070E",
        surface:   "#0F233D",
        text:      "#E2E8F0",
        "text-main":  "#F1F5F9",
        "text-muted": "#94A3B8",
        "text-dark":  "#040914",
      },

      fontFamily: {
        sans:    ["var(--font-inter)", "system-ui", "sans-serif"],
        mono:    ["var(--font-jetbrains-mono)", "monospace"],
        display: ["var(--font-outfit)", "var(--font-inter)", "sans-serif"],
      },

      borderColor: {
        DEFAULT: "rgba(255,255,255,0.08)",
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
