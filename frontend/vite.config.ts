import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: "./index.html",
        sw: "./public/service-worker.js",
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === "sw"
            ? "service-worker.js"
            : "assets/[name]-[hash].js";
        },
      },
    },
  },
});
