import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canAccessReports, homeForRole } from "@/lib/tenant";
import { HistoryList } from "@/app/staff/history/history-list";
import { PageIntro } from "@/components/page-intro";

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccessReports(session.user.role)) {
    redirect(homeForRole(session.user.role));
  }

  return (
    <div>
      <PageIntro kicker="Kayıt" title="Geçmiş siparişler">
        Kapanan masalar, kim ne yedi, hesap ne kadardı.
      </PageIntro>
      <HistoryList />
    </div>
  );
}
