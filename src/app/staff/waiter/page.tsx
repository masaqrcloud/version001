import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canAccessWaiter, homeForRole } from "@/lib/tenant";
import { WaiterBoard } from "@/app/staff/waiter/waiter-board";
import { PageIntro } from "@/components/page-intro";
import { VenueFloorPlan } from "@/components/venue-floor-plan";
import { EnableStaffNotifications } from "@/components/enable-staff-notifications";

export default async function WaiterPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccessWaiter(session.user.role)) {
    redirect(homeForRole(session.user.role));
  }

  return (
    <div>
      <PageIntro kicker="Salon" title="Açık masalar">
        Yeni siparişler ve garson çağrıları burada durur.
      </PageIntro>
      <div className="mt-4">
        <EnableStaffNotifications />
      </div>
      <VenueFloorPlan />
      <WaiterBoard />
    </div>
  );
}
