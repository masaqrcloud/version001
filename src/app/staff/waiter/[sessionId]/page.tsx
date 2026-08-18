import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canAccessWaiter, homeForRole } from "@/lib/tenant";
import { WaiterSession } from "@/app/staff/waiter/[sessionId]/waiter-session";

export default async function WaiterSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccessWaiter(session.user.role)) {
    redirect(homeForRole(session.user.role));
  }

  const { sessionId } = await params;
  return <WaiterSession sessionId={sessionId} />;
}
