// Grupo de animaciones de tween.js. Todas las animaciones se añaden a este
// grupo y se actualizan a la vez desde el bucle principal.
import * as TWEEN from "@tweenjs/tween.js";

export const tweens = new TWEEN.Group();

// Crea un tween que pertenece al grupo de la aplicación
export function createTween(values) {
  return new TWEEN.Tween(values, tweens);
}