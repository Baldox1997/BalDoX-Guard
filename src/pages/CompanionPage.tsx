import { useEffect, useState } from "react";
import { BalDoXAvatar } from "../components/baldox/BalDoXAvatar";
import type { BalDoXAnimationState } from "../constants/assistant";
import { api } from "../services/apiService";
import {
  DEFAULT_COMPANION_SPEED,
  openMainAssistant,
  startCompanionPatrol,
  stopCompanionPatrol,
  subscribeCompanionAnimation,
  syncCompanionWithSettings,
  type CompanionAnimationState,
} from "../services/companionService";

export function CompanionPage() {
  const [anim, setAnim] = useState<CompanionAnimationState>({
    animation: "idle",
    direction: 1,
  });
  const [speed, setSpeed] = useState(DEFAULT_COMPANION_SPEED);

  useEffect(() => {
    document.documentElement.classList.add("companion-window");
    document.body.classList.add("companion-window");

    return () => {
      document.documentElement.classList.remove("companion-window");
      document.body.classList.remove("companion-window");
    };
  }, []);

  useEffect(() => {
    api.getSettings().then((s) => {
      setSpeed(s.baldox_companion_speed ?? DEFAULT_COMPANION_SPEED);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const unsubAnim = subscribeCompanionAnimation(setAnim);

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        void startCompanionPatrol(speed);
      } else {
        stopCompanionPatrol();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    handleVisibility();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      unsubAnim();
      stopCompanionPatrol();
    };
  }, [speed]);

  const avatarState: BalDoXAnimationState =
    anim.animation === "walking" ? "walking" : "idle";

  return (
    <div
      className="companion-root flex h-screen w-screen select-none items-end justify-center"
      title="BalDoX — clique para conversar"
      onClick={() => void openMainAssistant()}
      onDoubleClick={() => void openMainAssistant()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") void openMainAssistant();
      }}
    >
      <div className="h-[180px] w-[120px] cursor-pointer">
        <BalDoXAvatar
          state={avatarState}
          size="sm"
          variant="companion"
          walkDirection={anim.direction}
        />
      </div>
    </div>
  );
}

/** Sincroniza visibilidade do companion na janela principal. */
export function BalDoXCompanionInit() {
  useEffect(() => {
    api.getSettings().then((s) => syncCompanionWithSettings(s)).catch(() => {});
  }, []);

  return null;
}
