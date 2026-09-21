import { prisma } from "@/lib/db";
import { customerVenueLoyalty } from "@/lib/loyalty";
import { sendLoyaltyRewardMail } from "@/lib/customer-mail";

/**
 * Sipariş sonrası müdavim kartını kontrol eder; yeni bir ikram hakkı
 * kazanıldıysa müşteriye tek seferlik e-posta gönderir.
 *
 * `VenueMember.loyaltyMailed`, haberi verilmiş toplam ikram sayısını tutar.
 * İptal edilen siparişler sayacı düşürebildiği için değer aşağı doğru da
 * eşitlenir; böylece hak yeniden kazanıldığında e-posta tekrar gidebilir.
 */
export async function notifyLoyaltyReward(customerId: string, venueId: string) {
  const loyalty = await customerVenueLoyalty(customerId, venueId);
  const member = loyalty.member;
  if (!member || !loyalty.item || !loyalty.venue) return false;

  if (loyalty.earned < member.loyaltyMailed) {
    await prisma.venueMember.update({
      where: { id: member.id },
      data: { loyaltyMailed: loyalty.earned },
    });
    return false;
  }
  if (loyalty.earned <= member.loyaltyMailed || loyalty.available < 1) {
    return false;
  }

  const claimed = await prisma.venueMember.updateMany({
    where: { id: member.id, loyaltyMailed: member.loyaltyMailed },
    data: { loyaltyMailed: loyalty.earned },
  });
  if (claimed.count !== 1) return false;

  try {
    const sent = await sendLoyaltyRewardMail({
      customerId,
      venueName: loyalty.venue.name,
      itemName: loyalty.item.name,
      available: loyalty.available,
      threshold: loyalty.threshold,
    });
    if (!sent) throw new Error("MAIL_SKIPPED");
    return true;
  } catch (error) {
    await prisma.venueMember.updateMany({
      where: { id: member.id, loyaltyMailed: loyalty.earned },
      data: { loyaltyMailed: member.loyaltyMailed },
    });
    if (error instanceof Error && error.message === "MAIL_SKIPPED") return false;
    throw error;
  }
}
