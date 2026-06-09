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
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      // Design handoff (specs/001-agentmarket/design): Space Grotesk display, JetBrains Mono data
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "-400px 0" }, "100%": { backgroundPosition: "400px 0" } },
        slideIn: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        popIn: { from: { opacity: "0", transform: "scale(0.94)" }, to: { opacity: "1", transform: "scale(1)" } },
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        shimmer: "shimmer 1.5s linear infinite",
        "slide-in": "slideIn 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "pop-in": "popIn 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "fade-in": "fadeIn 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
