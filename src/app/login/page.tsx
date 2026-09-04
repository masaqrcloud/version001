import Link from "next/link";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/app/login/login-form";
import { homeForRole } from "@/lib/tenant";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ password?: string }>;
}) {
  const session = await auth();
  const query = await searchParams;

  return (
    <AppShell
      nav={
        <ButtonLink href="/apply" variant="ghost" size="sm">
          Başvuru
        </ButtonLink>
      }
    >
      <div className="grid flex-1 items-center gap-12 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-10">
        <div className="max-w-xl">
          <p className="page-kicker">Giriş</p>
          <h1 className="page-title text-5xl sm:text-6xl">
            İşletme panelinize hoş geldiniz.
          </h1>
          <p className="page-lead text-lg">
            Menü, masalar, mutfak ve ekip tek hesap altında yönetilir. Giriş
            yaptığınızda kaldığınız yerden devam edersiniz.
          </p>
          <p className="mt-3 text-[var(--muted)]">
            Misafirler masadaki kod ile menüye ulaşır. Siz e-posta ve şifrenizle
            işletme paneline girersiniz.
          </p>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="h-2 bg-[var(--accent)]" />
          <div className="p-7 sm:p-8">
          <p className="page-kicker">MasaQR</p>
          <h2 className="mt-3 text-3xl">Hesabınıza giriş yapın</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Kayıtlı hesabınızla panele bağlanın. Yeni bir işletme için başvuru
            formunu kullanabilirsiniz.
          </p>
          {session?.user?.name ? (
            <p className="mt-4 rounded-xl bg-black/5 px-3 py-2 text-sm">
              Şu an <span className="font-medium">{session.user.name}</span>{" "}
              olarak oturum açmış durumdasınız.{" "}
              <Link
                href={homeForRole(session.user.role)}
                className="text-[var(--accent)]"
              >
                Panele git
              </Link>
            </p>
          ) : null}
          {query.password === "updated" ? (
            <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.
            </p>
          ) : null}
          <LoginForm />
          <p className="mt-6 text-sm text-[var(--muted)]">
            Hesabınız yok mu?{" "}
            <Link href="/apply" className="text-[var(--accent)]">
              Başvuru
            </Link>
          </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
