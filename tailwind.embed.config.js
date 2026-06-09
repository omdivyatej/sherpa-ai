/** @type {import("tailwindcss").Config} */
module.exports = {
  // Embed-only content: just the files that get bundled into companion.js.
  // The wider dashboard files are excluded so the generated CSS stays lean.
  content: [
    "./src/**/*.{ts,tsx}",
    "./components/Companion.tsx",
    "./components/CustomCursor.tsx",
    "./components/Toast.tsx",
  ],
  theme: { extend: {} },
  plugins: [],
};
