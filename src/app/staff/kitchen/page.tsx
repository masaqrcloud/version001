import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canAccessKitchen, homeForRole } from "@/lib/tenant";
import { KitchenBoard } from "@/app/staff/kitchen/kitchen-board";
import { PageIntro } from "@/components/page-intro";
import { EnableStaffNotifications } from "@/components/enable-staff-notifications";

export default async function KitchenPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccessKitchen(session.user.role)) {
    redirect(homeForRole(session.user.role));
  }

  return (
    <div>
      <PageIntro kicker="Mutfak" title="Siparişler">
        Yeni, hazırlanıyor, hazır. Garson servisi işaretler.
      </PageIntro>
      <div className="mt-4">
        <EnableStaffNotifications />
      </div>
      <KitchenBoard />
    </div>
  );
}
