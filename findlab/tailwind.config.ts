import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#1F2430",
        cream: "#F7F6F2",
        dgist: "#3B5BDB",
        cv: { DEFAULT: "#3B5BDB", tint: "#EEF2FF" },
        lab: { DEFAULT: "#0C8F6F", tint: "#E7F7F1" },
        mail: { DEFAULT: "#D9480F", tint: "#FFF1E8" },
      },
      fontFamily: {
        sans: ["Pretendard Variable", "Pretendard", "-apple-system", "BlinkMacSystemFont", "Noto Sans KR", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(31,36,48,0.04), 0 4px 16px rgba(31,36,48,0.06)",
      },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "-400px 0" }, "100%": { backgroundPosition: "400px 0" } },
      },
      animation: { shimmer: "shimmer 1.4s linear infinite" },
    },
  },
  plugins: [],
};
export default config;
