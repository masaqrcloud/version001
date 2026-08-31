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

  playChime();

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

function playChime() {
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    void ctx.resume();
    const master = ctx.createGain();
    const notes = [523.25, 659.25, 783.99];
    const startAt = ctx.currentTime + 0.02;

    master.gain.setValueAtTime(0.7, startAt);
    master.connect(ctx.destination);

    notes.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteStart = startAt + index * 0.13;

      oscillator.type = index === notes.length - 1 ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.055, noteStart + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.38);

      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.4);
    });

    window.setTimeout(() => void ctx.close(), 900);
  } catch {
    // sessiz kalabilir
  }
}
