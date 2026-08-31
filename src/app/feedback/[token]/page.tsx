import { Card } from "@/components/ui/card";
import { SessionFeedbackForm } from "@/components/session-feedback-form";

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg items-center px-4 py-8">
      <Card className="w-full p-6">
        <p className="page-kicker">MasaQR</p>
        <h1 className="mt-2 font-serif text-3xl">Deneyimini değerlendir</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Görüşün mekânın hizmetini geliştirmesine yardımcı olur.
        </p>
        <div className="mt-6">
          <SessionFeedbackForm token={decodeURIComponent(token)} />
        </div>
      </Card>
    </main>
  );
}
