// Ragdoll Lab - Roberto Rodríguez Guillén
// Punto de entrada: inicializa todo y lanza el bucle de animación
import * as THREE from "three";
import Ammo from "ammojs-typed";

import { initGraphics, resetCamera, scene, camera, renderer } from "./scene";
import { initPhysics, updatePhysics } from "./physics";
import { createEnvironment, resetGround } from "./environment";
import { createDummy, removeDummy, cutRope, updateRope } from "./dummy";
import { removeProjectiles, updateTurrets, removeTurrets } from "./weapons";
import { initUI } from "./ui";
import { tweens, createTween } from "./animation";
import { initAudio, playSound } from "./sounds";

const clock = new THREE.Clock();

Ammo(Ammo).then(start);

function start() {
  initGraphics();
  initAudio(camera, scene);
  initPhysics();
  createEnvironment();
  createDummy();
  initUI({ cutRope, reset });

  animationLoop();
}

// Reinicio animado: se borra todo, el suelo sube por ondas desde el centro,
// la cámara vuelve a su sitio y, al terminar, aparece de nuevo el muñeco
let dummyTween = null;

function reset() {
  if (dummyTween) dummyTween.stop(); // por si se reinicia dos veces seguidas
  removeDummy();
  removeProjectiles();
  removeTurrets();

  const duration = resetGround();
  playSound("rebuild");
  resetCamera(duration);
  dummyTween = createTween({})
    .to({}, duration)
    .onComplete(createDummy)
    .start();
}

function animationLoop() {
  requestAnimationFrame(animationLoop);
  // Se limita el paso para evitar saltos si la pestaña estuvo en segundo plano
  const deltaTime = Math.min(clock.getDelta(), 1 / 30);
  updatePhysics(deltaTime);
  updateTurrets(deltaTime);
  updateRope();
  tweens.update();
  renderer.render(scene, camera);
}