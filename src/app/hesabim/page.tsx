import { AppShell } from "@/components/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GuestHistory } from "@/components/guest-history";
import { LocaleProvider } from "@/components/locale-provider";

export default function AccountPage() {
  return (
    <AppShell
      nav={
        <>
          <ButtonLink href="/login" variant="ghost" size="sm">
            Mekân girişi
          </ButtonLink>
          <ButtonLink href="/" variant="secondary" size="sm">
            Ana sayfa
          </ButtonLink>
        </>
      }
    >
      <LocaleProvider>
        <div className="mx-auto w-full max-w-xl py-8">
          <Card className="p-6 sm:p-8">
            <GuestHistory />
          </Card>
        </div>
      </LocaleProvider>
    </AppShell>
  );
}
