/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        // Graphite brand scale
        brand: {
          50:  "#F4F5F6",
          100: "#E8EAEC",
          200: "#CFD3D8",
          300: "#ABB1B9",
          400: "#838A94",
          500: "#5B6169",
          600: "#454A50",
          700: "#33373C",
          800: "#232629",
          900: "#151719",
        },
        // Ink (warm black) scale for text + dark surfaces
        ink: {
          50:  "#F7F6F4",
          100: "#EEECE8",
          200: "#DEDAD3",
          300: "#C3BEB5",
          400: "#94908A",
          500: "#6B6862",
          600: "#4A4742",
          700: "#322F2C",
          800: "#211F1D",
          900: "#141414",
        },
        paper: "#FFFFFF",
        bone:  "#FAF8F4",
      },
      boxShadow: {
        card:  "0 1px 2px rgba(20,20,20,0.05), 0 4px 16px -4px rgba(20,20,20,0.06)",
        lift:  "0 2px 4px rgba(20,20,20,0.06), 0 16px 40px -12px rgba(20,20,20,0.14)",
        brand: "0 4px 14px -2px rgba(91, 97, 105,0.35)",
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "shield-in": "shieldIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "fade-up": "fadeUp 0.4s ease forwards",
      },
      keyframes: {
        shieldIn: {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        fadeUp: {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
