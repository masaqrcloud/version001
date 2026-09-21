import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { GoogleJoinButton } from "@/components/google-join-button";
import { getCustomerFromCookie, isGoogleAuthConfigured } from "@/lib/customer";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const query = await searchParams;
  const googleAuth = isGoogleAuthConfigured();

  if (query.google !== "error" && query.google !== "off") {
    const customer = await getCustomerFromCookie();
    if (customer) redirect("/hesabim");
  }

  return (
    <AppShell
      nav={
        <>
          <ButtonLink href="/mekan-giris" variant="ghost" size="sm">
            Mekân girişi
          </ButtonLink>
          <ButtonLink href="/" variant="secondary" size="sm">
            Ana sayfa
          </ButtonLink>
        </>
      }
    >
      <div className="grid flex-1 items-center gap-12 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-10">
        <div className="max-w-xl">
          <p className="page-kicker">Giriş</p>
          <h1 className="page-title text-5xl sm:text-6xl">
            Siparişlerin ve müdavim kartların tek yerde.
          </h1>
          <p className="page-lead text-lg">
            Masada Google ile giriş yaptıysan geçmiş siparişlerini ve müdavim
            ikramlarını evden de görebilirsin.
          </p>
          <p className="mt-3 text-[var(--muted)]">
            Mekân sahibi veya çalışan mısın?{" "}
            <Link href="/mekan-giris" className="text-[var(--accent)]">
              Mekân girişine geç
            </Link>
            .
          </p>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="h-2 bg-[var(--accent)]" />
          <div className="p-7 sm:p-8">
            <p className="page-kicker">Misafir</p>
            <h2 className="mt-3 text-3xl">Google ile giriş yap</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Şifre yok, kayıt yok. Masada kullandığın Google hesabıyla gir.
            </p>
            {query.google === "error" ? (
              <p className="mt-4 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">
                Google ile bağlanılamadı, tekrar dene.
              </p>
            ) : null}
            {query.google === "off" || !googleAuth ? (
              <p className="mt-4 rounded-xl bg-soft px-3 py-2 text-sm text-[var(--muted)]">
                Google girişi şu an kapalı.
              </p>
            ) : (
              <GoogleJoinButton
                className="mt-6"
                href="/api/guest/auth/google"
                label="Google ile giriş yap"
              />
            )}
            <p className="mt-6 text-sm text-[var(--muted)]">
              Zaten giriş yaptın mı?{" "}
              <Link href="/hesabim" className="text-[var(--accent)]">
                Siparişlerime git
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
