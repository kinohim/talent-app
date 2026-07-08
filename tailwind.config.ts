import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          500: "#3560d8",
          600: "#2a4bb0",
          700: "#213b8a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
