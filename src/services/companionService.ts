import { invoke } from "@tauri-apps/api/core";
import { PhysicalPosition, getCurrentWindow } from "@tauri-apps/api/window";
import type { AppSettings } from "../types/api";

export interface MonitorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CompanionAnimationState {
  animation: "idle" | "walking";
  direction: 1 | -1;
}

const COMPANION_WIDTH = 140;
const COMPANION_HEIGHT = 200;
const BOTTOM_MARGIN = 48;

type PatrolPhase = "idle" | "walking";

interface PatrolState {
  phase: PatrolPhase;
  direction: 1 | -1;
  x: number;
  y: number;
  pauseUntil: number;
}

let patrolRaf: number | null = null;
let patrolState: PatrolState | null = null;
let cachedBounds: MonitorRect | null = null;
let animationListener: ((state: CompanionAnimationState) => void) | null = null;

function emitAnimation(state: CompanionAnimationState) {
  animationListener?.(state);
}

export function subscribeCompanionAnimation(cb: (state: CompanionAnimationState) => void) {
  animationListener = cb;
  cb({ animation: "idle", direction: 1 });
  return () => {
    if (animationListener === cb) animationListener = null;
  };
}

export function stopCompanionPatrol() {
  if (patrolRaf !== null) {
    cancelAnimationFrame(patrolRaf);
    patrolRaf = null;
  }
  patrolState = null;
  emitAnimation({ animation: "idle", direction: 1 });
}

export async function startCompanionPatrol(speedPxPerSec = 80) {
  stopCompanionPatrol();

  const win = getCurrentWindow();
  if (win.label !== "companion") return;

  cachedBounds = await invoke<MonitorRect>("get_monitor_work_area");
  const pos = await win.outerPosition();

  const y = cachedBounds.y + cachedBounds.height - COMPANION_HEIGHT - BOTTOM_MARGIN;
  const minX = cachedBounds.x;
  const maxX = cachedBounds.x + cachedBounds.width - COMPANION_WIDTH;
  const clampedX = Math.min(Math.max(pos.x, minX), maxX);

  patrolState = {
    phase: "idle",
    direction: Math.random() > 0.5 ? 1 : -1,
    x: clampedX,
    y,
    pauseUntil: Date.now() + 800 + Math.random() * 1800,
  };

  emitAnimation({ animation: "idle", direction: patrolState.direction });
  await win.setPosition(new PhysicalPosition(Math.round(patrolState.x), Math.round(patrolState.y)));

  let lastTime = performance.now();
  let boundsRefreshAt = 0;

  const tick = async (now: number) => {
    if (!patrolState) return;

    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (now > boundsRefreshAt) {
      try {
        cachedBounds = await invoke<MonitorRect>("get_monitor_work_area");
        boundsRefreshAt = now + 5000;
      } catch {
        /* keep cached */
      }
    }

    const bounds = cachedBounds;
    if (!bounds) {
      patrolRaf = requestAnimationFrame(tick);
      return;
    }

    const edgeMinX = bounds.x;
    const edgeMaxX = bounds.x + bounds.width - COMPANION_WIDTH;
    patrolState.y = bounds.y + bounds.height - COMPANION_HEIGHT - BOTTOM_MARGIN;

    if (patrolState.phase === "idle") {
      if (Date.now() >= patrolState.pauseUntil) {
        patrolState.phase = "walking";
        emitAnimation({ animation: "walking", direction: patrolState.direction });
      }
    } else {
      patrolState.x += patrolState.direction * speedPxPerSec * dt;

      if (patrolState.x <= edgeMinX) {
        patrolState.x = edgeMinX;
        patrolState.direction = 1;
        patrolState.phase = "idle";
        patrolState.pauseUntil = Date.now() + 1200 + Math.random() * 2200;
        emitAnimation({ animation: "idle", direction: 1 });
      } else if (patrolState.x >= edgeMaxX) {
        patrolState.x = edgeMaxX;
        patrolState.direction = -1;
        patrolState.phase = "idle";
        patrolState.pauseUntil = Date.now() + 1200 + Math.random() * 2200;
        emitAnimation({ animation: "idle", direction: -1 });
      }

      try {
        await win.setPosition(
          new PhysicalPosition(Math.round(patrolState.x), Math.round(patrolState.y)),
        );
      } catch {
        stopCompanionPatrol();
        return;
      }
    }

    patrolRaf = requestAnimationFrame(tick);
  };

  patrolRaf = requestAnimationFrame(tick);
}

export async function openMainAssistant() {
  try {
    await invoke("focus_main_window");
  } catch {
    /* browser preview */
  }
}

/** Mostra ou esconde a janela companion conforme settings + modo secretário. */
export async function syncCompanionWithSettings(settings: AppSettings) {
  const secretaryOn = settings.baldox_secretary_active ?? true;
  const enabled = settings.baldox_desktop_companion && secretaryOn;

  try {
    if (enabled) {
      await invoke("show_companion_window");
    } else {
      await invoke("hide_companion_window");
    }
  } catch {
    /* fora do Tauri */
  }
}

export const DEFAULT_COMPANION_SPEED = 80;
