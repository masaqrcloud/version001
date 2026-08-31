import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MasaQR Personel",
    short_name: "MasaQR",
    description: "Masa siparişleri, mutfak ve garson bildirimleri",
    start_url: "/login",
    display: "standalone",
    background_color: "#f7f1e8",
    theme_color: "#e54b32",
    lang: "tr",
    icons: [
      {
        src: "/masaqr-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
