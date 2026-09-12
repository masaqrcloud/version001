"use client";

import { cn } from "@/lib/utils";
import { orderStatusLabel } from "@/lib/labels";
import type { OrderStatus } from "@prisma/client";
import { useLocaleOptional } from "@/components/locale-provider";
import type { GuestMessage } from "@/lib/i18n-guest";

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

const orderTone: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  PREPARING: "bg-sky-100 text-sky-900",
  READY: "bg-emerald-100 text-emerald-900",
  SERVED: "bg-stone-200 text-stone-700",
  CANCELLED: "bg-red-100 text-red-800",
};

export function OrderBadge({ status }: { status: OrderStatus }) {
  const loc = useLocaleOptional();
  const label = loc
    ? loc.t(`order${status}` as GuestMessage)
    : orderStatusLabel[status];
  return <Badge className={orderTone[status]}>{label}</Badge>;
}
