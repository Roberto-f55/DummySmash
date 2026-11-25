// Coche: motor que acelera (onda en diente de sierra que sube de tono)
import { createBuffer, lowpass } from "./helpers";

const DURATION = 1.2;

export const car = {
  volume: 0.7,
  create(ctx) {
    return createBuffer(ctx, DURATION, (t, s) => {
      s.phase = (s.phase || 0) + (55 + 90 * t) / ctx.sampleRate;
      const saw = (s.phase % 1) * 2 - 1;
      const engine = lowpass(s, "a", saw, 0.15);
      const envelope = Math.min(1, t * 10) * Math.min(1, (DURATION - t) * 4);
      return engine * envelope * 0.8;
    });
  },
};