import { AppShell } from "@/components/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApplicationForm } from "@/app/apply/application-form";

export default function ApplicationPage() {
  return (
    <AppShell
      nav={
        <ButtonLink href="/login" variant="secondary" size="sm">
          Giriş yap
        </ButtonLink>
      }
    >
      <div className="mx-auto grid w-full max-w-5xl flex-1 items-start gap-10 py-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="lg:sticky lg:top-8">
          <p className="page-kicker">MasaQR ailesi</p>
          <h1 className="page-title">Mekânını dijitale taşı.</h1>
          <p className="page-lead">
            Seni ve işletmeni tanıyalım. Başvurunu inceledikten sonra hesabını
            güvenli kurulum bağlantısıyla açalım.
          </p>
          <div className="mt-8 space-y-3 text-sm">
            {[
              "QR menü, sipariş ve masa yönetimi",
              "Stok ve çalışma saatleri takibi",
              "Rezervasyon ve dijital adisyon",
            ].map((benefit) => (
              <p
                key={benefit}
                className="rounded-2xl border border-[var(--line)] bg-white/60 px-4 py-3"
              >
                ✓ {benefit}
              </p>
            ))}
          </div>
          <p className="mt-6 text-xs leading-relaxed text-[var(--muted)]">
            Bilgilerin yalnızca başvurunu değerlendirmek ve seninle iletişim
            kurmak için kullanılır.
          </p>
        </div>
        <Card className="overflow-hidden p-0">
          <div className="h-2 bg-[var(--accent)]" />
          <div className="p-6 sm:p-8">
            <p className="font-serif text-2xl">İşletme bilgileri</p>
            <p className="mb-6 mt-1 text-sm text-[var(--muted)]">
              Formu doldurman yaklaşık iki dakika sürer.
            </p>
            <ApplicationForm />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
