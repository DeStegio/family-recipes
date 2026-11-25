import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/", name: "Οι Συνταγές της Μαμάς", short_name: "Οι Συνταγές",
    description: "Το οικογενειακό μας τετράδιο συνταγών.", lang: "el",
    start_url: "/", scope: "/", display: "standalone",
    background_color: "#f7f4ee", theme_color: "#933f2d",
    icons: [
      { src: "/icons/recipe-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/recipe-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
