"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { GuestPasaparola } from "@/components/guest-pasaparola";
import { GuestRather } from "@/components/guest-rather";

type GameId = "hub" | "pasaparola" | "rather";

export function GuestGames({
  guestToken,
  guestHeaders,
  onRoundLive,
  onImmersiveChange,
}: {
  guestToken: string;
  guestHeaders: (json?: boolean) => Record<string, string>;
  onRoundLive?: () => void;
  onImmersiveChange?: (on: boolean) => void;
}) {
  const [game, setGame] = useState<GameId>("hub");
  const [immersive, setImmersive] = useState(false);

  if (game === "pasaparola") {
    return (
      <div className="space-y-3">
        {immersive ? null : (
          <button
            type="button"
            className="text-sm text-[var(--muted)]"
            onClick={() => {
              onImmersiveChange?.(false);
              setGame("hub");
            }}
          >
            ← Oyunlar
          </button>
        )}
        <GuestPasaparola
          guestToken={guestToken}
          guestHeaders={guestHeaders}
          onRoundLive={onRoundLive}
          onImmersiveChange={(on) => {
            setImmersive(on);
            onImmersiveChange?.(on);
          }}
        />
      </div>
    );
  }

  if (game === "rather") {
    return (
      <div className="space-y-3">
        <button
          type="button"
          className="text-sm text-[var(--muted)]"
          onClick={() => setGame("hub")}
        >
          ← Oyunlar
        </button>
        <GuestRather guestToken={guestToken} guestHeaders={guestHeaders} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="page-kicker">Masa oyunları</p>
        <h2 className="mt-1 font-serif text-3xl">Oyna</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Aynı masadaki herkes aynı turu görür.
        </p>
      </div>
      <button type="button" className="w-full text-left" onClick={() => setGame("pasaparola")}>
        <Card className="p-5">
          <p className="font-serif text-2xl">Pasaparola</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Harf harf kelime. Hep beraber veya kapışma.
          </p>
        </Card>
      </button>
      <button type="button" className="w-full text-left" onClick={() => setGame("rather")}>
        <Card className="p-5">
          <p className="font-serif text-2xl">Cevap Ver</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Would you rather. Tanışma, yemek, hayal… 360 soru.
          </p>
        </Card>
      </button>
    </div>
  );
}
