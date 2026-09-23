/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "slate-950": "#090d16",
        "slate-900": "#0f172a",
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
    },
  },
  plugins: [],
};
