"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GuestPasaparola } from "@/components/guest-pasaparola";
import { GuestRather } from "@/components/guest-rather";
import { GuestMemory } from "@/components/guest-memory";
import { useLocale } from "@/components/locale-provider";

type GameId = "hub" | "pasaparola" | "rather" | "memory";

function GameNav({
  onHome,
  onGames,
}: {
  onHome: () => void;
  onGames: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" onClick={onHome}>
        {t("hubBack")}
      </Button>
      <Button type="button" size="sm" variant="secondary" onClick={onGames}>
        {t("backGames")}
      </Button>
    </div>
  );
}

export function GuestGames({
  guestToken,
  guestHeaders,
  onRoundLive,
  onImmersiveChange,
  onHome,
  onActiveGameChange,
}: {
  guestToken: string;
  guestHeaders: (json?: boolean) => Record<string, string>;
  onRoundLive?: () => void;
  onImmersiveChange?: (on: boolean) => void;
  onHome?: () => void;
  onActiveGameChange?: (active: boolean) => void;
}) {
  const { t } = useLocale();
  const [game, setGame] = useState<GameId>("hub");

  function openHub() {
    onImmersiveChange?.(false);
    onActiveGameChange?.(false);
    setGame("hub");
  }

  function openHome() {
    openHub();
    onHome?.();
  }

  function openGame(next: GameId) {
    onActiveGameChange?.(true);
    setGame(next);
  }

  if (game === "pasaparola") {
    return (
      <div className="space-y-3">
        <GameNav onHome={openHome} onGames={openHub} />
        <GuestPasaparola
          guestToken={guestToken}
          guestHeaders={guestHeaders}
          onRoundLive={onRoundLive}
          onImmersiveChange={onImmersiveChange}
        />
      </div>
    );
  }

  if (game === "rather") {
    return (
      <div className="space-y-3">
        <GameNav onHome={openHome} onGames={openHub} />
        <GuestRather guestToken={guestToken} guestHeaders={guestHeaders} />
      </div>
    );
  }

  if (game === "memory") {
    return (
      <div className="space-y-3">
        <GameNav onHome={openHome} onGames={openHub} />
        <GuestMemory
          guestToken={guestToken}
          guestHeaders={guestHeaders}
          onRoundLive={onRoundLive}
          onImmersiveChange={onImmersiveChange}
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
      <button type="button" className="w-full text-left" onClick={() => openGame("pasaparola")}>
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
      <button type="button" className="w-full text-left" onClick={() => openGame("rather")}>
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
      <button type="button" className="w-full text-left" onClick={() => openGame("memory")}>
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
