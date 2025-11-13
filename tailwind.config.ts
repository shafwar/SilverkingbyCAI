import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        luxury: {
          black: "#0a0a0a",
          gold: "#D4AF37",
          silver: "#C0C0C0",
          darkGold: "#B8960E",
          lightGold: "#FFD700",
          darkSilver: "#A8A8A8",
          lightSilver: "#E8E8E8",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        serif: ["Playfair Display", "serif"],
      },
      backgroundImage: {
        "gradient-luxury": "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)",
        "gradient-gold": "linear-gradient(135deg, #B8960E 0%, #D4AF37 50%, #FFD700 100%)",
        "gradient-silver": "linear-gradient(135deg, #A8A8A8 0%, #C0C0C0 50%, #E8E8E8 100%)",
      },
    },
  },
  plugins: [],
};

export default config;

