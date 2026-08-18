import Link from "next/link";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/app/login/login-form";
import { homeForRole } from "@/lib/tenant";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";

export default async function LoginPage() {
  const session = await auth();

  return (
    <AppShell
      nav={
        <ButtonLink href="/register" variant="ghost" size="sm">
          Mekânını aç
        </ButtonLink>
      }
    >
      <div className="grid flex-1 items-center gap-12 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-10">
        <div className="max-w-xl">
          <p className="page-kicker">Hoş geldin</p>
          <h1 className="page-title text-5xl sm:text-6xl">
            Mekânın seni bekliyor.
          </h1>
          <p className="page-lead text-lg">
            Masalar, menü, mutfak ve ekip aynı evin içinde. Giriş yaptığında
            kaldığın yerden devam edersin.
          </p>
          <p className="mt-3 text-[var(--muted)]">
            Misafir QR ile masaya oturur. Sen e-posta ve şifrenle evin kapısını
            açarsın.
          </p>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="h-2 bg-[var(--accent)]" />
          <div className="p-7 sm:p-8">
          <p className="page-kicker">MasaQR</p>
          <h2 className="mt-3 text-3xl">İçeri buyur</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Hesabınla mekânına gir. Yeni bir yer açacaksan kayıt olman yeterli.
          </p>
          {session?.user?.name ? (
            <p className="mt-4 rounded-xl bg-black/5 px-3 py-2 text-sm">
              Şu an <span className="font-medium">{session.user.name}</span>{" "}
              olarak açıksın.{" "}
              <Link
                href={homeForRole(session.user.role)}
                className="text-[var(--accent)]"
              >
                Panele git
              </Link>
            </p>
          ) : null}
          <LoginForm />
          <p className="mt-6 text-sm text-[var(--muted)]">
            İlk kez misin?{" "}
            <Link href="/register" className="text-[var(--accent)]">
              Mekânını oluştur
            </Link>
          </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
