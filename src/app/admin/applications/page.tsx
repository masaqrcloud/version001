import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { PageIntro } from "@/components/page-intro";

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

      <div className="mt-8 space-y-4">
        {applications.length === 0 ? (
          <Card className="p-6 text-sm text-[var(--muted)]">
            Henüz başvuru yok.
          </Card>
        ) : (
          applications.map((application) => (
            <Card
              key={application.id}
              className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div>
                <p className="font-serif text-2xl">{application.venueName}</p>
                <p className="mt-1 font-medium">{application.fullName}</p>
                <a
                  href={`mailto:${application.email}`}
                  className="mt-1 inline-block text-sm text-[var(--accent)]"
                >
                  {application.email}
                </a>
              </div>
              <div className="text-sm text-[var(--muted)] sm:text-right">
                <p>{application.status === "NEW" ? "Yeni" : "İncelendi"}</p>
                <time dateTime={application.createdAt.toISOString()}>
                  {new Intl.DateTimeFormat("tr-TR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Europe/Istanbul",
                  }).format(application.createdAt)}
                </time>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
