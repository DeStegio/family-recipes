import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const location = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const output = location("../.local/pages-demo");
const licenses = {
  "font-inter": "@fontsource-variable/inter",
  "font-noto-serif": "@fontsource-variable/noto-serif",
  react: "react",
  "react-dom": "react-dom",
  scheduler: "scheduler",
  "lucide-react": "lucide-react",
  tailwindcss: "tailwindcss",
};

export default defineConfig({
  root: location("."),
  base: "/family-recipes/",
  publicDir: false,
  resolve: {
    alias: { "@": location("../src"), "next/link": location("./link.tsx") },
  },
  css: { postcss: location("..") },
  plugins: [{
    name: "demo-licenses",
    apply: "build",
    async closeBundle() {
      const directory = join(output, "licenses");
      await mkdir(directory, { recursive: true });
      await Promise.all(Object.entries(licenses).map(([name, dependency]) =>
        copyFile(location(`../node_modules/${dependency}/LICENSE`), join(directory, name + ".txt")),
      ));
    },
  }],
  build: {
    outDir: output,
    emptyOutDir: true,
    assetsInlineLimit: 0,
  },
});
