import { AppShell } from "@/components/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CustomerSignOutButton } from "@/components/customer-sign-out-button";
import { GuestHistory } from "@/components/guest-history";
import { GuestLoyalty } from "@/components/guest-loyalty";
import { LocaleProvider } from "@/components/locale-provider";
import { getCustomerFromCookie } from "@/lib/customer";

export default async function AccountPage() {
  const customer = await getCustomerFromCookie();

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
          {customer ? <CustomerSignOutButton /> : null}
        </>
      }
    >
      <LocaleProvider>
        <div className="mx-auto w-full max-w-xl space-y-6 py-8">
          <Card className="p-6 sm:p-8">
            <GuestHistory />
          </Card>
          <Card className="p-6 sm:p-8">
            <GuestLoyalty />
          </Card>
        </div>
      </LocaleProvider>
    </AppShell>
  );
}
