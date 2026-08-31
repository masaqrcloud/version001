import Link from "next/link";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { ReservationForm } from "@/app/reservation/reservation-form";

export const dynamic = "force-dynamic";

export default async function ReservationPage() {
  const venues = await prisma.venue.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl py-8">
        <p className="page-kicker">Masa rezervasyonu</p>
        <h1 className="page-title">Masan hazır olsun.</h1>
        <p className="page-lead">
          Mekânı, tarihi, saati ve masanı seç. Onay durumunu e-posta ile
          bildirelim.
        </p>
        <Card className="mt-8 p-6 sm:p-8">
          {venues.length ? (
            <ReservationForm venues={venues} />
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Şu anda rezervasyon alınan bir mekân yok.
            </p>
          )}
        </Card>
        <Link href="/" className="mt-6 inline-block text-sm text-[var(--accent)]">
          Ana sayfaya dön
        </Link>
      </div>
    </AppShell>
  );
}
