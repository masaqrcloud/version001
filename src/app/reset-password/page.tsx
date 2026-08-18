import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { ResetPasswordForm } from "@/app/reset-password/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-6">
        <p className="page-kicker">Hesap güvenliği</p>
        <h1 className="page-title">Yeni şifreni belirle</h1>
        <p className="page-lead">En az 8 karakterli yeni şifreni oluştur.</p>
        <Card className="mt-8 p-7">
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <p className="text-sm text-red-700">
              Şifre yenileme bağlantısı eksik veya geçersiz.
            </p>
          )}
        </Card>
        <Link href="/login" className="mt-6 text-sm text-[var(--accent)]">
          Giriş ekranına dön
        </Link>
      </div>
    </AppShell>
  );
}
