/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#2563eb",
        "primary-hover": "#1d4ed8",
        "bg-base": "#f1f5f9",
        "surface": "#ffffff",
        "surface-glass": "rgba(255,255,255,0.72)",
        "text-main": "#0f172a",
        "text-muted": "#64748b",
        "border-light": "#e2e8f0",
        "darkBg": "#121212",
        "darkPanel": "#1E1E1E",
        "darkCard": "#2d2d2d",
        "darkBorder": "#333333",
        "brandBlue": "#3b82f6",
      },
      fontFamily: {
        "sans": ["Inter", "system-ui", "sans-serif"],
        "display": ["Inter", "sans-serif"],
      },
      borderRadius: {
        "DEFAULT": "0.5rem",
        "lg": "1rem",
        "xl": "1.5rem",
        "2xl": "2rem",
        "full": "9999px"
      },
      backdropBlur: {
        "glass": "12px",
      },
    },
  },
  plugins: [],
}
