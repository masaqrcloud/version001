import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-3xl">Masa bulunamadı</h1>
      <p className="text-[var(--muted)]">QR kod geçersiz veya masa silinmiş.</p>
      <Link href="/" className="text-[var(--accent)]">
        Ana sayfaya dön
      </Link>
    </div>
  );
}
