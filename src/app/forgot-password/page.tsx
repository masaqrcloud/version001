import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/app/forgot-password/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-6">
        <p className="page-kicker">Hesap güvenliği</p>
        <h1 className="page-title">Şifreni yenile</h1>
        <p className="page-lead">
          Hesabındaki e-posta adresini yaz. Sana güvenli bir bağlantı gönderelim.
        </p>
        <Card className="mt-8 p-7">
          <ForgotPasswordForm />
        </Card>
        <Link href="/login" className="mt-6 text-sm text-[var(--accent)]">
          Giriş ekranına dön
        </Link>
      </div>
    </AppShell>
  );
}
