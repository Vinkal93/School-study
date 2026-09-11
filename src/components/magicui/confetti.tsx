"use client";

import confetti from "canvas-confetti";

export interface ConfettiOptions {
  particleCount?: number;
  angle?: number;
  spread?: number;
  startVelocity?: number;
  decay?: number;
  gravity?: number;
  drift?: number;
  ticks?: number;
  origin?: { x: number; y: number };
  colors?: string[];
  shapes?: ("circle" | "square")[];
  scalar?: number;
  zIndex?: number;
  disableForReducedMotion?: boolean;
}

/**
 * Triggers dual side cannons confetti (Magic UI ConfettiSideCannons)
 * Fires celebratory particles from both left and right edges.
 */
export function triggerConfettiSideCannons(options?: {
  durationSeconds?: number;
  colors?: string[];
}) {
  const duration = (options?.durationSeconds || 3) * 1000;
  const end = Date.now() + duration;
  const colors = options?.colors || ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1", "#2563eb", "#10b981"];

  const frame = () => {
    if (Date.now() > end) return;

    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      startVelocity: 60,
      origin: { x: 0, y: 0.5 },
      colors: colors,
      zIndex: 99999,
    });
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      startVelocity: 60,
      origin: { x: 1, y: 0.5 },
      colors: colors,
      zIndex: 99999,
    });

    requestAnimationFrame(frame);
  };

  frame();
}

/**
 * Single celebratory burst
 */
export function triggerCelebrationBurst() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    zIndex: 99999,
  });
}

export default confetti;
