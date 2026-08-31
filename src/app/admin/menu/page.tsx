import { MenuManager } from "@/app/admin/menu/menu-manager";
import { PageIntro } from "@/components/page-intro";

export default function AdminMenuPage() {
  return (
    <div>
      <PageIntro kicker="Mutfak" title="Menü">
        Kategori, ürün ve yemek fotoğrafını buradan yönet. Günlük adet ve
        uyarılar için Stok sayfasını kullan.
      </PageIntro>
      <MenuManager />
    </div>
  );
}
