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
        background: "#f7f2e8",
        foreground: "#221b16",
        card: "#fffaf3",
        border: "#d7c8b6",
        primary: "#a23e2b",
        secondary: "#2f5d50",
        muted: "#efe5d8",
        accent: "#e3b04b",
      },
      fontFamily: {
        sans: ["'Space Grotesk'", "sans-serif"],
      },
      boxShadow: {
        panel: "0 20px 50px rgba(34, 27, 22, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
