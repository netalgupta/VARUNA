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
        // Linear / Vercel style clean neutrals
        accent: {
          DEFAULT: "#2563eb",
          hover:   "#1d4ed8",
          subtle:  "rgba(37, 99, 235, 0.1)",
        },
        bg:        "#09090b",
        surface:   "#121215",
        elevated:  "#18181b",
        subtle:    "#27272a",
        text: {
          primary:   "#f4f4f5",
          secondary: "#a1a1aa",
          muted:     "#71717a",
        },
      },

      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
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
