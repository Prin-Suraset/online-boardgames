/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "slate-950": "#090d16",
        "slate-900": "#101827",
        coral: "#ff7a66",
        cyan: "#67e8e1",
        mint: "#7ce6a3",
      },
      fontFamily: {
        display: ["Arial Black", "Avenir Next", "Segoe UI", "sans-serif"],
      },
      scale: {
        85: ".85",
      },
      spacing: {
        13: "3.25rem",
        15: "3.75rem",
        18: "4.5rem",
        19: "4.75rem",
      },
    },
  },
  plugins: [],
};
