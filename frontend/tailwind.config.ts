import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#2f6fbd",
          600: "#1a5fa8",
          700: "#154d8a",
          800: "#113f73",
          900: "#0d3060",
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.10)",
      },
      keyframes: {
        "slide-in": {
          "0%":   { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          "0%":   { opacity: "1" },
          "100%": { opacity: "0" },
        },
      },
      animation: {
        "slide-in":  "slide-in 0.2s ease-out both",
        "fade-out":  "fade-out 0.4s ease-in both",
      },
    },
  },
  plugins: [],
};

export default config;
