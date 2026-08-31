let alertCtx: AudioContext | null = null;

function audioContextClass() {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext ||
    null
  );
}

function getAlertContext() {
  const AudioCtx = audioContextClass();
  if (!AudioCtx) return null;
  if (!alertCtx || alertCtx.state === "closed") {
    alertCtx = new AudioCtx();
  }
  return alertCtx;
}

export async function unlockAlertAudio() {
  const ctx = getAlertContext();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") await ctx.resume();
    return ctx.state === "running";
  } catch {
    return false;
  }
}

export async function askAlertPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "default") return;
  try {
    await Notification.requestPermission();
  } catch {
    // Safari / HTTP ortamında izin penceresi açılmayabilir.
  }
}

export function pingPhone(
  title: string,
  body: string,
  kind: "kitchen" | "chime" = "chime",
) {
  try {
    window.navigator.vibrate?.([180, 80, 180, 80, 240]);
  } catch {
    // iOS titreşimi desteklemez.
  }

  if (kind === "kitchen") {
    playKitchenJingle();
  } else {
    playChime();
  }

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

function tone(
  ctx: AudioContext,
  destination: AudioNode,
  frequency: number,
  start: number,
  duration: number,
  peak = 0.22,
  type: OscillatorType = "triangle",
) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playKitchenJingle() {
  const ctx = getAlertContext();
  if (!ctx) return;
  void ctx.resume();

  try {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.95, ctx.currentTime);
    master.connect(ctx.destination);
    const t = ctx.currentTime + 0.02;

    // dı - dıı - dı-rı-rıı
    tone(ctx, master, 659.25, t, 0.11, 0.2, "triangle");
    tone(ctx, master, 783.99, t + 0.14, 0.16, 0.24, "triangle");
    tone(ctx, master, 659.25, t + 0.36, 0.09, 0.2, "square");
    tone(ctx, master, 880.0, t + 0.46, 0.1, 0.22, "triangle");
    tone(ctx, master, 1046.5, t + 0.58, 0.34, 0.28, "sine");
    tone(ctx, master, 1318.5, t + 0.62, 0.28, 0.12, "sine");
  } catch {
    // sessiz kalabilir
  }
}

function playChime() {
  const ctx = getAlertContext();
  if (!ctx) return;
  void ctx.resume();

  try {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.8, ctx.currentTime);
    master.connect(ctx.destination);
    const t = ctx.currentTime + 0.02;
    tone(ctx, master, 523.25, t, 0.22, 0.16);
    tone(ctx, master, 659.25, t + 0.12, 0.24, 0.16);
    tone(ctx, master, 783.99, t + 0.24, 0.32, 0.18, "sine");
  } catch {
    // sessiz kalabilir
  }
}

export function playKitchenOrderSound() {
  void unlockAlertAudio().then((ok) => {
    if (ok) playKitchenJingle();
  });
}
