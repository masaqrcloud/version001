import { AppShell } from "@/components/app-shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { readMailOptOutToken } from "@/lib/customer";

async function optOut(formData: FormData) {
  "use server";
  const customerId = readMailOptOutToken(
    String(formData.get("token") ?? "") || undefined,
  );
  if (!customerId) return;
  await prisma.customer.updateMany({
    where: { id: customerId, deletedAt: null },
    data: { mailOptOut: true },
  });
}

export default async function MailPreferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; off?: string }>;
}) {
  const query = await searchParams;
  const customerId = readMailOptOutToken(query.t);
  const customer = customerId
    ? await prisma.customer.findFirst({
        where: { id: customerId, deletedAt: null },
        select: { email: true, mailOptOut: true },
      })
    : null;

  return (
    <AppShell
      nav={
        <ButtonLink href="/hesabim" variant="ghost" size="sm">
          Siparişlerim
        </ButtonLink>
      }
    >
      <div className="mx-auto w-full max-w-lg py-10">
        <Card className="p-6 sm:p-8">
          <p className="page-kicker">E-posta tercihleri</p>
          {!customer ? (
            <>
              <h1 className="mt-2 font-serif text-3xl">Bağlantı geçersiz</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Bu bağlantının süresi dolmuş olabilir. Yeni bir MasaQR
                e-postasındaki bağlantıyı kullan.
              </p>
            </>
          ) : customer.mailOptOut ? (
            <>
              <h1 className="mt-2 font-serif text-3xl">Bildirimler kapalı</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {customer.email} adresine artık müdavim ve bilgilendirme
                e-postası göndermiyoruz. Dijital adisyon talebin olursa yine
                gönderilir.
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-2 font-serif text-3xl">Bildirimleri kapat</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {customer.email} adresine gönderdiğimiz müdavim ikramı ve
                bilgilendirme e-postalarını kapatabilirsin.
              </p>
              <form action={optOut} className="mt-6">
                <input type="hidden" name="token" value={query.t ?? ""} />
                <Button type="submit" variant="outline">
                  E-postaları kapat
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
