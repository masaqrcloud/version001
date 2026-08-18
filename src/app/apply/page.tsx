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
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-6">
        <p className="page-kicker">MasaQR ailesi</p>
        <h1 className="page-title">Başvuru yap</h1>
        <p className="page-lead">
          Mekânını ve seni tanıyalım. Ekibimiz başvurunu inceleyip sana ulaşsın.
        </p>
        <Card className="mt-8 overflow-hidden p-0">
          <div className="h-2 bg-[var(--accent)]" />
          <div className="p-7">
            <ApplicationForm />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
