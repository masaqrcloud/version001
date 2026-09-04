const WORDS = {
  A: ["arı", "ateş", "ayna", "ayak", "altın", "ağaç"],
  B: ["bal", "bebek", "buz", "bahçe", "bardak", "buğday"],
  C: ["cam", "ceket", "ceviz", "cuma", "cümle", "can"],
  Ç: ["çay", "çiçek", "çanta", "çocuk", "çorba", "çilek"],
  D: ["deniz", "dağ", "defter", "dünya", "diş", "duman"],
  E: ["ekmek", "elma", "ev", "eşek", "elbise", "eylül"],
  F: ["fırın", "fare", "fil", "fincan", "fırtına", "fidan"],
  G: ["güneş", "gül", "göl", "gece", "gemi", "göz"],
  H: ["hava", "harita", "hasta", "halk", "havuç", "haber"],
  I: ["ırmak", "ıspanak", "ızgara", "ıslık", "ıslak", "ıssız"],
  İ: ["inek", "ipek", "iğne", "insan", "inci", "isim"],
  J: ["jilet", "jandarma", "jest", "jaguar", "jakuzi", "jüpon"],
  K: ["kitap", "kedi", "kapı", "kalem", "kış", "kırmızı"],
  L: ["lale", "limon", "lamba", "leylek", "lira", "lokum"],
  M: ["masa", "mavi", "meyve", "mutfak", "mektup", "muz"],
  N: ["nar", "nehir", "nane", "nokta", "nişasta", "nüfus"],
  O: ["oda", "orman", "ocak", "okul", "oyun", "otel"],
  Ö: ["ördek", "ödev", "örtü", "öğretmen", "özlem", "öküz"],
  P: ["para", "pencere", "pilav", "pazar", "portakal", "peynir"],
  R: ["radyo", "resim", "renk", "rüya", "reçel", "rakı"],
  S: ["su", "saat", "sokak", "simit", "sabun", "sepet"],
  Ş: ["şehir", "şeker", "şapka", "şişe", "şarkı", "şimşek"],
  T: ["tuz", "tarla", "tren", "tavuk", "tohum", "tavan"],
  U: ["uçak", "uyku", "un", "uzay", "usta", "umut"],
  Ü: ["üzüm", "ütü", "ülke", "üniversite", "ürün", "üzengi"],
  V: ["vazo", "vatan", "vagon", "vakit", "veli", "vapur"],
  Y: ["yağmur", "yemek", "yol", "yıldız", "yumurta", "yaz"],
  Z: ["zeytin", "zil", "zaman", "zambak", "zemin", "zengin"],
};

function stripHtml(value) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function cleanClue(word, anlam) {
  let clue = stripHtml(anlam).replace(/\s*\([^)]*\)\s*/g, " ").trim();
  const folded = word.toLocaleLowerCase("tr-TR");
  clue = clue
    .split(/[.;]/)[0]
    .replace(new RegExp(word, "gi"), "…")
    .replace(new RegExp(folded, "gi"), "…")
    .trim();
  if (clue.length > 110) clue = `${clue.slice(0, 107)}…`;
  return clue || "TDK sözlük maddesi";
}

async function fetchWord(word) {
  const url = `https://sozluk.gov.tr/gts?ara=${encodeURIComponent(word)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "MasaQR/1.0 (pasaparola seed)",
    },
  });
  if (!res.ok) throw new Error(`${word} ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || !data[0]?.anlamlarListe?.[0]?.anlam) {
    throw new Error(`${word} tanımsız`);
  }
  const madde = String(data[0].madde || word);
  return {
    word: madde.toLocaleLowerCase("tr-TR"),
    clue: cleanClue(madde, data[0].anlamlarListe[0].anlam),
  };
}

const rows = [];
for (const [letter, list] of Object.entries(WORDS)) {
  for (const word of list) {
    try {
      const entry = await fetchWord(word);
      rows.push({ letter, word: entry.word, clue: entry.clue });
      process.stdout.write(`${letter}:${word} ok\n`);
    } catch (error) {
      rows.push({
        letter,
        word: word.toLocaleLowerCase("tr-TR"),
        clue: "TDK Güncel Türkçe Sözlük maddesi",
      });
      process.stdout.write(`${letter}:${word} yedek\n`);
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
}

const fs = await import("node:fs/promises");
const out = new URL("../src/lib/pasaparola-words.json", import.meta.url);
await fs.writeFile(out, JSON.stringify(rows));
process.stdout.write(`yazıldı ${rows.length} ${out.pathname}\n`);
