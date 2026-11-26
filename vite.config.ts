import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Served from GitHub Pages at /marshmallowknitwear/. With a custom domain, set BASE=/ when building.
export default defineConfig({
  base: process.env.BASE ?? "/marshmallowknitwear/",
  plugins: [react(), tailwindcss()],
  build: { sourcemap: false, chunkSizeWarningLimit: 900 },
});
