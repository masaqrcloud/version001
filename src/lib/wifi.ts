export function isAndroidDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

/** Android 10+ Wi‑Fi bottom sheet (Looks like a share panel). */
export function openAndroidWifiConnect() {
  const href = "intent:#Intent;action=android.settings.panel.action.WIFI;end";
  const link = document.createElement("a");
  link.href = href;
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

