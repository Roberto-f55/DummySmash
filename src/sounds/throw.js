// Lanzamiento: "fiuu" de aire que sube y baja
import { createBuffer, noise, lowpass } from "./helpers";

const DURATION = 0.35;

export const throwSound = {
  volume: 0.5,
  create(ctx) {
    return createBuffer(ctx, DURATION, (t, s) => {
      const envelope = Math.sin((Math.PI * t) / DURATION);
      const k = 0.05 + 0.25 * envelope; // el filtro se abre a mitad del sonido
      return lowpass(s, "a", noise(), k) * envelope * 2;
    });
  },
};