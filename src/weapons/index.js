// Armas: lista de armas disponibles y lanzamiento de proyectiles.
// Cada arma está en su propio archivo; para añadir una nueva basta con
// crear su archivo e incluirla en "weapons".
import * as THREE from "three";
import { margin, createRigidBody, removeObject } from "../physics";
import { playSound } from "../sounds";
import { ball } from "./ball";
import { cube } from "./cube";
import { car } from "./car";
import { turret, updateTurrets, removeTurrets } from "./turret";
import { bomb } from "./bomb";

export { updateTurrets, removeTurrets };

// Cada arma define: label (texto del botón), key (tecla), mass, speed,
// create(material) -> { mesh, shape } y, opcionalmente, friction, spawn() y
// sound (nombre del sonido al lanzarla; por defecto "throw").
// Un arma con use(origin, direction) hace algo distinto a lanzar (torreta, bomba)
export const weapons = { ball, cube, car, turret, bomb };

const MAX_PROJECTILES = 30;
const projectiles = [];

export let currentWeapon = "ball";

export function selectWeapon(id) {
  currentWeapon = id;
}

// Lanza el arma actual desde "origin" en la dirección indicada (normalizada)
export function shoot(origin, direction) {
  const weapon = weapons[currentWeapon];
  if (weapon.use) {
    weapon.use(origin, direction);
    return;
  }

  const material = new THREE.MeshPhongMaterial({
    color: Math.floor(Math.random() * (1 << 24)),
  });
  const { mesh, shape } = weapon.create(material);

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  shape.setMargin(margin);

  // Cada arma puede decidir desde dónde sale; si no, sale desde la cámara
  const start = weapon.spawn
    ? weapon.spawn(origin, direction, weapon.speed)
    : spawnFromCamera(origin, direction, weapon.speed);
  const body = createRigidBody(
    mesh,
    shape,
    weapon.mass,
    start.pos,
    start.quat,
    start.vel,
    start.angVel
  );
  if (weapon.friction !== undefined) body.setFriction(weapon.friction);
  playSound(weapon.sound || "throw", start.pos);

  projectiles.push(mesh);
  if (projectiles.length > MAX_PROJECTILES) removeObject(projectiles.shift());
}

export function removeProjectiles() {
  while (projectiles.length) removeObject(projectiles.pop());
}

// Sale un poco por delante de la cámara, con algo de giro aleatorio
function spawnFromCamera(origin, direction, speed) {
  return {
    pos: direction.clone().add(origin),
    quat: new THREE.Quaternion(0, 0, 0, 1),
    vel: direction.clone().multiplyScalar(speed),
    angVel: new THREE.Vector3(
      Math.random() * 4 - 2,
      Math.random() * 4 - 2,
      Math.random() * 4 - 2
    ),
  };
}