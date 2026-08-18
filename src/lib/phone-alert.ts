export async function askAlertPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "default") return;
  try {
    await Notification.requestPermission();
  } catch {
    // Safari / HTTP ortamında izin penceresi açılmayabilir.
  }
}

export function pingPhone(title: string, body: string) {
  try {
    window.navigator.vibrate?.([180, 80, 180]);
  } catch {
    // iOS titreşimi desteklemez.
  }

  playBeep();

  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      try {
        new Notification(title, { body, tag: "masaqr-order" });
      } catch {
        // HTTP / arka plan kısıtı
      }
    }
  }

  const previous = document.title;
  document.title = `● ${title}`;
  window.setTimeout(() => {
    document.title = previous;
  }, 4000);
}

function playBeep() {
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
    osc.onended = () => void ctx.close();
  } catch {
    // sessiz kalabilir
  }
}
