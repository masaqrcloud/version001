import { getStaffUser } from "@/lib/tenant";
import { PageIntro } from "@/components/page-intro";
import { StockManager } from "@/app/admin/stock/stock-manager";

export const dynamic = "force-dynamic";

export default async function AdminStockPage() {
  const { user } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (!user?.venueId) {
    return (
      <div>
        <PageIntro kicker="Mutfak" title="Stok">
          Önce Ayarlar’dan bir kafe seç veya ekle.
        </PageIntro>
      </div>
    );
  }

  return (
    <div>
      <PageIntro kicker="Mutfak" title="Stok yönetimi">
        Sipariş düşünce adet azalır, iptalde geri gelir. Teslimat, fire ve
        sayımı da buradan işlersin.
      </PageIntro>
      <StockManager />
    </div>
  );
}
