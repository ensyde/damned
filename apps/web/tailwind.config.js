/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        accent: "var(--color-accent)",
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-2": "var(--color-surface-2)",
        muted: "var(--color-muted)",
        "text-base": "var(--color-text)",
        "text-muted": "var(--color-text-muted)",
        border: "var(--color-border)",
      },
      fontFamily: {
        sans: ["var(--font-family)", "Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "var(--border-radius)",
        md: "calc(var(--border-radius) * 1.5)",
        lg: "calc(var(--border-radius) * 2)",
      },
    },
  },
  plugins: [],
};
