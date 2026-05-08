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
        ink: "#1f2937",
        mist: "#f8fafc",
        clay: "#f97316",
        pine: "#0f766e",
        sand: "#fff7ed",
      },
      boxShadow: {
        panel: "0 18px 48px rgba(15, 23, 42, 0.08)",
      },
      borderRadius: {
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
