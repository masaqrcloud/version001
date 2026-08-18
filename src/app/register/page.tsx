import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { homeForRole } from "@/lib/tenant";
import { RegisterForm } from "@/app/register/register-form";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user?.role) {
    redirect(homeForRole(session.user.role));
  }

  return (
    <AppShell
      nav={
        <ButtonLink href="/login" variant="secondary" size="sm">
          Giriş yap
        </ButtonLink>
      }
    >
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-6">
        <p className="page-kicker">Yeni ev</p>
        <h1 className="page-title">Mekânını aç</h1>
        <p className="page-lead">
          Adını yaz, evini kur. Menü, masalar ve ekip sonra gelir.
        </p>
        <Card className="mt-8 overflow-hidden p-0">
          <div className="h-2 bg-[var(--accent)]" />
          <div className="p-7">
            <RegisterForm />
          </div>
        </Card>
        <p className="mt-6 text-sm text-[var(--muted)]">
          Zaten hesabın var mı?{" "}
          <Link href="/login" className="text-[var(--accent)]">
            Giriş yap
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
