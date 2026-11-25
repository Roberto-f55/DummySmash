// Explosión: ruido grave que se apaga poco a poco y un retumbe de baja frecuencia
import { createBuffer, noise, lowpass } from "./helpers";

export const explosion = {
  volume: 1.0,
  create(ctx) {
    return createBuffer(ctx, 3, (t, s) => {
      const envelope = Math.exp(-t * 1.6) * Math.min(1, t * 200);
      const rumble = lowpass(s, "a", noise(), 0.02) * 6;
      const crack = lowpass(s, "b", noise(), 0.3) * Math.exp(-t * 12);
      const boom = Math.sin(2 * Math.PI * 45 * t) * Math.exp(-t * 3);
      return Math.max(-1, Math.min(1, (rumble + crack + boom * 0.6) * envelope));
    });
  },
};