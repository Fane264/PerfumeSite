import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Decanturi Niche — Parfumuri de Nișă",
    short_name: "Decanturi Niche",
    description:
      "Decanturi autentice din cele mai renumite case de parfumuri de nișă",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0A0A",
    theme_color: "#C9A84C",
    lang: "ro",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
