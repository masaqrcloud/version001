import type { Metadata } from "next";
import { HomePage } from "@/components/home-page";

export const metadata: Metadata = {
  title: "MasaQR | Dijital menü ve masa sipariş yönetimi",
  description:
    "Kafe ve restoran işletmeleri için dijital menü, masa siparişi, mutfak ekranı ve 1 Temmuz yönetmeliğine uygun alerjen-kalori bildirimi.",
};

export default function Page() {
  return <HomePage />;
}
