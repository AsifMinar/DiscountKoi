import type { MetadataRoute } from "next";
import { BASE_PATH } from "@/lib/site";
import { DEFAULT_DESCRIPTION } from "@/lib/metadata";

// Written to /manifest.webmanifest at build time. Lets phones install the site like an app.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  const root = `${BASE_PATH}/`;
  return {
    id: root,
    name: "Discount Koi: Sudbury deals",
    short_name: "Discount Koi",
    description: DEFAULT_DESCRIPTION,
    start_url: root,
    scope: root,
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f6f2ee",
    theme_color: "#f6f2ee",
    lang: "en-CA",
    categories: ["shopping", "lifestyle"],
    icons: [
      {
        src: `${BASE_PATH}/icons/icon-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${BASE_PATH}/icons/icon-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${BASE_PATH}/icons/maskable-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Compare prices", url: `${root}products/` },
      { name: "Free stuff", url: `${root}free/` },
      { name: "Student discounts", url: `${root}student/` },
    ],
  };
}
