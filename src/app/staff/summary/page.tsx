import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canAccessReports, homeForRole } from "@/lib/tenant";
import { SummaryView } from "@/app/staff/summary/summary-view";
import { PageIntro } from "@/components/page-intro";

export default async function SummaryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccessReports(session.user.role)) {
    redirect(homeForRole(session.user.role));
  }

  return (
    <div>
      <PageIntro kicker="Kasa" title="Gün sonu">
        Bugünün cirosu, açık hesaplar ve en çok satanlar. Saat Türkiye saati.
      </PageIntro>
      <SummaryView />
    </div>
  );
}
