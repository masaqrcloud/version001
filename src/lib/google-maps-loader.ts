let loading: Promise<typeof google.maps> | null = null;

export function googleMapsBrowserKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
}

export function loadGoogleMaps() {
  const key = googleMapsBrowserKey();
  if (!key) return Promise.reject(new Error("NO_KEY"));
  if (typeof window === "undefined") {
    return Promise.reject(new Error("WINDOW"));
  }
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    const existing = document.getElementById(
      "masaqr-google-maps",
    ) as HTMLScriptElement | null;
    const done = () => {
      if (window.google?.maps) resolve(window.google.maps);
      else reject(new Error("NO_MAPS"));
    };
    if (existing) {
      existing.addEventListener("load", done, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("LOAD")),
        { once: true },
      );
      return;
    }
    const script = document.createElement("script");
    script.id = "masaqr-google-maps";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&language=tr&region=TR&v=weekly`;
    script.onload = done;
    script.onerror = () => {
      loading = null;
      reject(new Error("LOAD"));
    };
    document.head.appendChild(script);
  });

  return loading;
}
