// Reconstrucción: barrido ascendente con un brillo que acompaña a la onda del suelo
import { createBuffer } from "./helpers";

const DURATION = 1.8;

export const rebuild = {
  volume: 0.5,
  create(ctx) {
    return createBuffer(ctx, DURATION, (t, s) => {
      const freq = 120 + 500 * (t / DURATION) ** 2;
      s.phase = (s.phase || 0) + freq / ctx.sampleRate;
      const tone = Math.sin(2 * Math.PI * s.phase);
      const shimmer = Math.sin(2 * Math.PI * s.phase * 2.01) * 0.3;
      const envelope = Math.min(1, t * 4) * Math.min(1, (DURATION - t) * 3);
      return (tone + shimmer) * envelope * 0.4;
    });
  },
};