import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";

const notes = [
  {
    n: "01",
    title: "Misafir kendi temposunda",
    body: "QR okutulur, isim yazılır ya da geçilir. Herkes kendi sepetinden sipariş verir.",
  },
  {
    n: "02",
    title: "Mutfak ve salon aynı anda",
    body: "Sipariş düşer düşmez mutfak görür. Garson masayı, hesabı ve çağrıları tek yerden takip eder.",
  },
  {
    n: "03",
    title: "Sen evi yönetirsin",
    body: "Menü, logo, masalar ve ekip senin panelinde. Her mekân yalnızca kendi evini görür.",
  },
];

export default function HomePage() {
  return (
    <AppShell
      nav={
        <>
          <ButtonLink href="/apply" variant="ghost" size="sm">
            Başvuru yap
          </ButtonLink>
          <ButtonLink href="/login" variant="secondary" size="sm">
            Giriş yap
          </ButtonLink>
        </>
      }
    >
      <section className="grid items-stretch gap-8 pt-4 lg:grid-cols-[1.15fr_0.85fr] lg:pt-8">
        <div className="flex flex-col justify-center">
          <p className="page-kicker">MasaQR</p>
          <h1 className="page-title max-w-xl text-5xl sm:text-6xl">
            Masadaki sükûnet, mutfaktaki düzen.
          </h1>
          <p className="page-lead text-lg">
            Kafe ve restoranlar için QR masa siparişi. Misafir menüye kendi
            telefonundan bakar, sen salonu ve mutfağı tek yerden yönetirsin.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/login" size="lg">
              Mekânına gir
            </ButtonLink>
            <ButtonLink href="/apply" variant="outline" size="lg">
              Başvuru yap
            </ButtonLink>
          </div>
        </div>

        <div className="hero-panel">
          <p className="page-kicker">Bu akşam</p>
          <p className="mt-3 font-serif text-4xl leading-tight">
            Bir masa, bir QR, herkesin kendi siparişi.
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/80">
            Garson koşturmaz, mutfak tahmin etmez. Sipariş yazılır, hazır
            olunca misafir haberdar olur.
          </p>
        </div>
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-3">
        {notes.map((note) => (
          <Card key={note.title} className="p-6">
            <p className="text-sm font-semibold text-[var(--accent)]">{note.n}</p>
            <p className="mt-2 font-serif text-2xl">{note.title}</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              {note.body}
            </p>
          </Card>
        ))}
      </section>
    </AppShell>
  );
}
