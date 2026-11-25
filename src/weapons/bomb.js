// Bomba: explota donde se hace clic. Arranca el suelo y lanza por los aires
// todo lo que tenga masa, salvo el muñeco (el pórtico es estático).
// La parte visual (bola de fuego, onda expansiva y destello) se anima con tween.js
import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { createTween } from "../animation";
import Ammo from "ammojs-typed";
import { scene } from "../scene";
import { getDynamicObjects } from "../physics";
import { breakGround } from "../environment";
import { playSound } from "../sounds";

const BLAST_SPEED = 40; // velocidad que reciben los objetos junto a la explosión
const BLAST_FALLOFF = 0.08; // cuánto pierde con la distancia
const UP_BIAS = 0.8; // empuje extra hacia arriba

const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

export const bomb = {
  label: "Bomba",
  key: "5",
  use(origin, direction) {
    const ray = new THREE.Ray(origin, direction);
    const point = ray.intersectPlane(groundPlane, new THREE.Vector3());
    if (point) explode(point);
  },
};

function explode(center) {
  breakGround();
  pushObjects(center);
  playSound("explosion", center);
  playExplosionAnimation(center);
}

// ---------------------------------------------------------------------------
// Física: cada objeto sale despedido hacia fuera desde el centro, más rápido
// cuanto más cerca esté
// ---------------------------------------------------------------------------
function pushObjects(center) {
  const direction = new THREE.Vector3();
  const velocity = new Ammo.btVector3();
  const spin = new Ammo.btVector3();

  for (const object of getDynamicObjects()) {
    if (object.userData.dummyPart) continue; // el muñeco no se toca

    direction.subVectors(object.position, center);
    const distance = direction.length();
    direction.normalize();
    direction.y += UP_BIAS;
    direction.normalize();

    const speed = BLAST_SPEED / (1 + distance * BLAST_FALLOFF);
    direction.multiplyScalar(speed);

    const body = object.userData.physicsBody;
    velocity.setValue(direction.x, direction.y, direction.z);
    body.setLinearVelocity(velocity);
    spin.setValue(rand(6), rand(6), rand(6));
    body.setAngularVelocity(spin);
  }

  Ammo.destroy(velocity);
  Ammo.destroy(spin);
}

function rand(max) {
  return (Math.random() * 2 - 1) * max;
}

// ---------------------------------------------------------------------------
// Animación con tween.js
// ---------------------------------------------------------------------------
function playExplosionAnimation(center) {
  // Bola de fuego: crece y se desvanece
  const fireball = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 16),
    new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      side: THREE.DoubleSide, // se ve también desde dentro si alcanza la cámara
      depthWrite: false,
    })
  );
  fireball.position.copy(center);
  scene.add(fireball);

  createTween({ scale: 0.1, opacity: 1 })
    .to({ scale: 9, opacity: 0 }, 1400)
    .easing(TWEEN.Easing.Exponential.Out)
    .onUpdate((v) => {
      fireball.scale.setScalar(v.scale);
      fireball.material.opacity = v.opacity;
      // Pasa de amarillo a rojo oscuro mientras se apaga
      fireball.material.color.setHSL(0.12 * v.opacity, 1, 0.5);
    })
    .onComplete(() => removeVisual(fireball))
    .start();

  // Onda expansiva: anillo plano que se abre por el suelo
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 1, 64),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      side: THREE.DoubleSide,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(center);
  ring.position.y += 0.05;
  scene.add(ring);

  createTween({ scale: 1, opacity: 0.9 })
    .to({ scale: 40, opacity: 0 }, 1800)
    .easing(TWEEN.Easing.Quadratic.Out)
    .onUpdate((v) => {
      ring.scale.setScalar(v.scale);
      ring.material.opacity = v.opacity;
    })
    .onComplete(() => removeVisual(ring))
    .start();

  // Destello: una luz muy intensa que se apaga rápido
  const flash = new THREE.PointLight(0xffcc88, 0, 120);
  flash.position.copy(center);
  flash.position.y += 2;
  scene.add(flash);

  createTween({ intensity: 6 })
    .to({ intensity: 0 }, 900)
    .easing(TWEEN.Easing.Cubic.Out)
    .onUpdate((v) => {
      flash.intensity = v.intensity;
    })
    .onComplete(() => scene.remove(flash))
    .start();
}

function removeVisual(mesh) {
  scene.remove(mesh);
  mesh.geometry.dispose();
  mesh.material.dispose();
}