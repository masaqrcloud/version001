import type { Prisma } from "@prisma/client";

export function formatTableGroup(
  primaryNumber: string,
  extraNumbers: string[] = [],
) {
  const numbers = [primaryNumber, ...extraNumbers].filter(Boolean);
  const unique = [...new Set(numbers)].sort((a, b) =>
    a.localeCompare(b, "tr", { numeric: true }),
  );
  return unique.join(" + ");
}

export async function absorbSession(
  tx: Prisma.TransactionClient,
  fromId: string,
  toId: string,
) {
  if (fromId === toId) return;
  await tx.guest.updateMany({
    where: { tableSessionId: fromId },
    data: { tableSessionId: toId },
  });
  await tx.order.updateMany({
    where: { tableSessionId: fromId },
    data: { tableSessionId: toId },
  });
  const fromBill = await tx.bill.findUnique({ where: { tableSessionId: fromId } });
  if (fromBill) {
    await tx.bill.delete({ where: { id: fromBill.id } });
  }
  const from = await tx.tableSession.findUnique({
    where: { id: fromId },
    select: { waiterCalledAt: true },
  });
  const to = await tx.tableSession.findUnique({
    where: { id: toId },
    select: { waiterCalledAt: true },
  });
  if (from?.waiterCalledAt && !to?.waiterCalledAt) {
    await tx.tableSession.update({
      where: { id: toId },
      data: { waiterCalledAt: from.waiterCalledAt },
    });
  }
  await tx.table.updateMany({
    where: { mergedSessionId: fromId },
    data: { mergedSessionId: toId },
  });
  await tx.tableSession.update({
    where: { id: fromId },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      waiterCalledAt: null,
    },
  });
}

export async function releaseMergedTables(
  tx: Prisma.TransactionClient,
  sessionId: string,
) {
  await tx.table.updateMany({
    where: { mergedSessionId: sessionId },
    data: { mergedSessionId: null },
  });
}

type FloorAnchor = {
  id: string;
  number: string;
  floorX: number | null;
  floorY: number | null;
  sessionId: string | null;
  primaryTableId: string | null;
};

export function clusteredPosition(
  table: FloorAnchor,
  all: FloorAnchor[],
  fallbackIndex: number,
  fallbackTotal: number,
) {
  const stored =
    table.floorX !== null && table.floorY !== null
      ? { x: table.floorX, y: table.floorY }
      : autoFloorPosition(fallbackIndex, fallbackTotal);

  if (
    !table.sessionId ||
    !table.primaryTableId ||
    table.id === table.primaryTableId
  ) {
    return stored;
  }

  const primary = all.find((item) => item.id === table.primaryTableId);
  if (!primary) return stored;
  const primaryPos =
    primary.floorX !== null && primary.floorY !== null
      ? { x: primary.floorX, y: primary.floorY }
      : stored;

  const extras = all
    .filter(
      (item) =>
        item.sessionId === table.sessionId && item.id !== table.primaryTableId,
    )
    .sort((a, b) => a.number.localeCompare(b.number, "tr", { numeric: true }));
  const index = Math.max(
    0,
    extras.findIndex((item) => item.id === table.id),
  );

  return {
    x: Math.max(70, Math.min(930, primaryPos.x + (index + 1) * 90)),
    y: Math.max(100, Math.min(900, primaryPos.y + (index % 2) * 36)),
  };
}

export function autoFloorPosition(index: number, total: number) {
  const columns = Math.max(1, Math.ceil(Math.sqrt(total)));
  const rows = Math.max(1, Math.ceil(total / columns));
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: Math.round(((column + 0.5) / columns) * 1000),
    y: Math.round(((row + 0.5) / rows) * 1000),
  };
}
