/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Esse miolo garante que o Tailwind entre na pasta 'game'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}