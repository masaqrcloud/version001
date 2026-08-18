import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageIntro } from "@/components/page-intro";
import { ApplicationsManager } from "@/app/admin/applications/applications-manager";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const session = await auth();
  if (session?.user?.role !== "PLATFORM") {
    redirect("/admin");
  }

  const applications = await prisma.application.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageIntro kicker="MasaQR" title="Başvurular">
        Ana sayfadaki formdan gelen mekân başvuruları.
      </PageIntro>

      <div className="mt-8">
        <ApplicationsManager
          applications={applications.map((application) => ({
            id: application.id,
            fullName: application.fullName,
            email: application.email,
            phone: application.phone,
            venueName: application.venueName,
            city: application.city,
            venueType: application.venueType,
            message: application.message,
            status: application.status,
            createdAt: application.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
