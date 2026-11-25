// Disparo: chasquido corto de ruido con un golpe grave
import { createBuffer, noise, lowpass } from "./helpers";

export const shot = {
  volume: 0.35,
  create(ctx) {
    return createBuffer(ctx, 0.25, (t, s) => {
      const crack = lowpass(s, "a", noise(), 0.5) * Math.exp(-t * 40);
      const thump = Math.sin(2 * Math.PI * 110 * t) * Math.exp(-t * 25);
      return (crack + thump * 0.6) * 0.9;
    });
  },
};