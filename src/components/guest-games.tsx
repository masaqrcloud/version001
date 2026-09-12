"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { GuestPasaparola } from "@/components/guest-pasaparola";
import { GuestRather } from "@/components/guest-rather";
import { GuestMemory } from "@/components/guest-memory";
import { useLocale } from "@/components/locale-provider";

type GameId = "hub" | "pasaparola" | "rather" | "memory";

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
  const { t } = useLocale();
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
            {t("backGames")}
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
          {t("backGames")}
        </button>
        <GuestRather guestToken={guestToken} guestHeaders={guestHeaders} />
      </div>
    );
  }

  if (game === "memory") {
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
            {t("backGames")}
          </button>
        )}
        <GuestMemory
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

  return (
    <div className="space-y-4">
      <div>
        <p className="page-kicker">{t("playKicker")}</p>
        <h2 className="mt-1 font-serif text-3xl">{t("playTitle")}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {t("playIntro")}
        </p>
      </div>
      <button type="button" className="w-full text-left" onClick={() => setGame("pasaparola")}>
        <Card className="game-pick">
          <div className="photo-box game-pick-photo w-full">
            <img src="/guest/game-pasaparola.png" alt="" />
          </div>
          <div className="game-pick-copy">
            <p className="font-serif text-2xl">{t("gamePasaparola")}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {t("gamePasaparolaHint")}
            </p>
          </div>
        </Card>
      </button>
      <button type="button" className="w-full text-left" onClick={() => setGame("rather")}>
        <Card className="game-pick">
          <div className="photo-box game-pick-photo w-full">
            <img src="/guest/game-rather.png" alt="" />
          </div>
          <div className="game-pick-copy">
            <p className="font-serif text-2xl">{t("gameRather")}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {t("gameRatherHint")}
            </p>
          </div>
        </Card>
      </button>
      <button type="button" className="w-full text-left" onClick={() => setGame("memory")}>
        <Card className="game-pick">
          <div className="photo-box game-pick-photo w-full">
            <img src="/guest/game-memory.png" alt="" />
          </div>
          <div className="game-pick-copy">
            <p className="font-serif text-2xl">{t("gameMemory")}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {t("gameMemoryHint")}
            </p>
          </div>
        </Card>
      </button>
    </div>
  );
}
