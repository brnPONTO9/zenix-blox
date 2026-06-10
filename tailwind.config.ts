import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular"]
      },
      colors: {
        obsidian: "#080A12",
        graphite: "#111522",
        volt: "#77F7C8",
        plasma: "#7C5CFF",
        danger: "#FF5573",
        warning: "#FFCE63"
      },
      boxShadow: {
        neon: "0 0 40px rgba(119, 247, 200, 0.16)",
        violet: "0 0 44px rgba(124, 92, 255, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
