import type { BillStatus, OrderStatus, Role } from "@prisma/client";

export const roleLabel: Record<Role, string> = {
  PLATFORM: "Uygulama sahibi",
  OWNER: "Mekan sahibi",
  ADMIN: "Yönetici",
  WAITER: "Garson",
  KITCHEN: "Mutfak",
};

export const orderStatusLabel: Record<OrderStatus, string> = {
  PENDING: "Yeni",
  PREPARING: "Hazırlanıyor",
  READY: "Hazır",
  SERVED: "Servis edildi",
  CANCELLED: "İptal",
};

export const billStatusLabel: Record<BillStatus, string> = {
  UNPAID: "Ödenmedi",
  PAID: "Ödendi",
};
