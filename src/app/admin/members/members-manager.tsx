"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Popup } from "@/components/ui/popup";

type Member = {
  id: string;
  name: string | null;
  email: string;
  joinedAt: string;
  orderCount: number;
  loyaltyFilled?: number;
  loyaltyRewards?: number;
};

export function MembersManager() {
  const [members, setMembers] = useState<Member[]>([]);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlinkId, setUnlinkId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/members", {
      cache: "no-store",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Üyeler yüklenemedi");
      return;
    }
    setError(null);
    setMembers(data.members ?? []);
    setCount(data.count ?? 0);
  }

  useEffect(() => {
    void load();
  }, []);

  async function unlink() {
    if (!unlinkId) return;
    setBusy(true);
    const res = await fetch(`/api/admin/members/${unlinkId}`, {
      method: "DELETE",
      credentials: "include",
    });
    setBusy(false);
    setUnlinkId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "İlişik kesilemedi");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <p className="page-kicker">Mail ile üye</p>
        <p className="mt-1 font-serif text-3xl">{count}</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Google ile bağlanan misafir sayısı. İsimle devam edenler burada
          görünmez.
        </p>
      </Card>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {!members.length ? (
        <p className="text-sm text-[var(--muted)]">Henüz mail ile üye yok.</p>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <Card
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="font-medium">{member.name || "İsimsiz"}</p>
                <p className="truncate text-sm text-[var(--muted)]">
                  {member.email}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {new Date(member.joinedAt).toLocaleDateString("tr-TR")} ·{" "}
                  {member.orderCount} sipariş
                  {member.loyaltyFilled != null
                    ? ` · Müdavim ${member.loyaltyFilled}/10${
                        member.loyaltyRewards
                          ? ` · ${member.loyaltyRewards} ikram`
                          : ""
                      }`
                    : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setUnlinkId(member.id)}
              >
                İlişği kes
              </Button>
            </Card>
          ))}
        </div>
      )}
      <Popup
        title="MasaQR ilişiğini kes"
        message={
          unlinkId
            ? "Bu üye mekân listenden çıkar. Kendi geçmiş siparişleri durur; tekrar Google ile bağlanırsa yeniden üye olur."
            : null
        }
        confirmLabel="İlişği kes"
        cancelLabel="Vazgeç"
        busy={busy}
        onConfirm={() => void unlink()}
        onClose={() => setUnlinkId(null)}
      />
    </div>
  );
}
